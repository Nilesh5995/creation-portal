import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { ConfigService, UtilService, ResourceService, ToasterService } from '@sunbird/shared';
import { PublicDataService, ContentService, UserService, ProgramsService, EnrollContributorService  } from '@sunbird/core';
import * as _ from 'lodash-es';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { CbseProgramService } from '../../services';
import { ProgramStageService, ProgramTelemetryService } from '../../../program/services';
import { ISessionContext, IChapterListComponentInput } from '../../interfaces';
import { InitialState } from '../../interfaces';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ServerResponse, RequestParam, HttpOptions } from '@sunbird/shared';
//import { PassThrough } from 'stream';
@Component({
  selector: 'app-collection',
  templateUrl: './collection.component.html',
  styleUrls: ['./collection.component.scss']
})
export class CollectionComponent implements OnInit, OnDestroy {

  @Input() collectionComponentInput: any;
  @Output() isCollectionSelected  = new EventEmitter<any>();
  public sessionContext: ISessionContext = {};
  public chapterListComponentInput: IChapterListComponentInput = {};
  public programContext: any;
  public userProfile: any;
  public sharedContext: any = {};
  public collectionComponentConfig: any;
  public stageSubscription: any;
  public filteredList: Array<any>;
  public collection;
  public collectionsWithCardImage;
  public role: any = {};
  public collectionList: any = {};
  public mediums;
  public showError = false;
  public classes;
  public board;
  public filters;
  public telemetryInteractCdata: any;
  public telemetryInteractPdata: any;
  public nominateButton = 'hide';
  public nominate = '';
  isMediumClickable = false;
  showLoader = true;
  selectedIndex = -1;
  activeFilterIndex = -1;
  public state: InitialState = {
    stages: []
  };
  public showStage;
  public currentStage: any;
  public contentType:any;
  showContentTypeModal = false;
  selectedContentTypes = [];
  selectedCollectionIds = [];
  public isOrgAdmin =false;
  public isIndividualUser =false;
  public nominationStatus = '';
  public enroll = false;
  ExpressIntrest = true;
 
  _slideConfig = {'slidesToShow': 10, 'slidesToScroll': 1, 'variableWidth': true};
  constructor(private configService: ConfigService, public publicDataService: PublicDataService,
    private cbseService: CbseProgramService, public programStageService: ProgramStageService,
    public resourceService: ResourceService, public programTelemetryService: ProgramTelemetryService,
    public userService: UserService, public utilService: UtilService, public contentService: ContentService,
    private activatedRoute: ActivatedRoute, private router: Router, private programsService: ProgramsService, private tosterService: ToasterService, public http: HttpClient, public enrollContributorService : EnrollContributorService,) { }

  ngOnInit() {
    this.stageSubscription = this.programStageService.getStage().subscribe(state => {
      this.state.stages = state.stages;
      this.changeView();
    });

    this.currentStage = 'collectionComponent';
    this.userProfile = _.get(this.collectionComponentInput, 'userProfile');
    console.log(this.userProfile)
    this.collectionComponentConfig = _.get(this.collectionComponentInput, 'config');
    this.programContext = _.get(this.collectionComponentInput, 'programContext');
    this.sharedContext = this.collectionComponentInput.programContext.config.sharedContext.reduce((obj, context) => {
      return {...obj, [context]: this.getSharedContextObjectProperty(context)};
    }, {});
    
    this.contentType = _.get(this.programContext, 'content_types'),
    console.log(this.programContext, "this si the content types")
    this.sessionContext = _.assign(this.collectionComponentInput.sessionContext, {
      
      currentRole: _.get(this.programContext, 'userDetails.roles[0]'),
      bloomsLevel: _.get(this.programContext, 'config.scope.bloomsLevel'),
      programId: _.get(this.programContext, 'programId'),
      //programId: '31ab2990-7892-11e9-8a02-93c5c62c03f1' || _.get(this.programContext, 'programId'),
      program: _.get(this.programContext, 'name'),
      onBoardSchool: _.get(this.programContext, 'userDetails.onBoardingData.school'),
      collectionType: _.get(this.collectionComponentConfig, 'collectionType'),
      collectionStatus: _.get(this.collectionComponentConfig, 'status')
    }, this.sharedContext);
    this.filters = this.getImplicitFilters();
    this.getCollectionCard();
    const getCurrentRoleId = _.find(this.programContext.config.roles, {'name': this.sessionContext.currentRole});
    this.sessionContext.currentRoleId = (getCurrentRoleId) ? getCurrentRoleId.id : null;
    this.sessionContext.programId = this.programContext.program_id
    this.role.currentRole = this.sessionContext.currentRole;
    this.classes = _.find(this.collectionComponentConfig.config.filters.explicit, {'code': 'gradeLevel'}).range;
    this.mediums = _.find(this.collectionComponentConfig.config.filters.implicit, {'code': 'medium'}).defaultValue;
    this.board = _.find(this.collectionComponentConfig.config.filters.implicit, {'code': 'board'}).defaultValue;
    (_.size(this.mediums) > 1) ? this.isMediumClickable = true : this.isMediumClickable = false;

    // tslint:disable-next-line:max-line-length
    this.telemetryInteractCdata = this.programTelemetryService.getTelemetryInteractCdata(this.collectionComponentInput.programContext.programId, 'Program');
    // tslint:disable-next-line:max-line-length
    this.telemetryInteractPdata = this.programTelemetryService.getTelemetryInteractPdata(this.userService.appId, this.configService.appConfig.TELEMETRY.PID + '.programs');
    this.checkOrgAdmin();
    if(this.isOrgAdmin === false)
    {
        this.checkIdividualUser() 
    }
    if(this.isOrgAdmin || this.isIndividualUser)
    {
        this.enroll = true;
        this.getNomination()
    }
  }

  getImplicitFilters(): string[] {
    const sharedContext = this.collectionComponentInput.programContext.config.sharedContext,
    implicitFilter = this.collectionComponentConfig.config.filters.implicit,
    availableFilters = this.filterByCollection(implicitFilter, 'code', sharedContext);
    return availableFilters;
  }

  filterByCollection(collection: any[], filterBy: any, filterValue: any[]) {
    return collection.filter( (el) => {
      return filterValue.some((f: any) => {
        if ( _.isArray(el[filterBy])) {
          return f === _.intersectionBy(el[filterBy], filterValue).toString();
        } else {
          return el[filterBy].includes(f);
        }
      });
    });
  }

  getCollectionCard() {
    this.searchCollection().subscribe((res) => {
      const { constantData, metaData, dynamicFields } = this.configService.appConfig.LibrarySearch;
      const filterArr = _.groupBy(res.result.content, 'identifier');
      const filteredTextbook = this.filterTextBook(filterArr);
      const collectionCards = this.utilService.getDataForCard(filteredTextbook, constantData, dynamicFields, metaData);
      this.collectionsWithCardImage = _.forEach(collectionCards, collection => this.addCardImage(collection));
      this.filterCollectionList(this.classes);
      this.showLoader = false;
      this.showError = false;
    });
  }

  filterTextBook(filterArr) {
    const filteredTextbook = [];
    _.forEach(filterArr, (collection) => {
      if (collection.length > 1) {
        const groupedCollection = _.find(collection, (item) => {
          return item.status === 'Draft';
        });
        filteredTextbook.push(groupedCollection);
      } else {
        filteredTextbook.push(collection[0]);
      }
    });
    return filteredTextbook;
  }

  setAndClearFilterIndex(index: number) {
    if (this.activeFilterIndex === index && this.selectedIndex >= 0)  {
      this.filterCollectionList(this.classes);
      this.selectedIndex =  -1;
    } else {
      this.selectedIndex = this.activeFilterIndex  = index;
    }
  }

  filterCollectionList(filterValue?: any, filterBy = 'gradeLevel') {
    let filterValueItem: any[];
    if (_.isArray(filterValue)) {
      filterValueItem = filterValue;
    } else {
      const filterArray = [];
      filterArray.push(filterValue);
      filterValueItem = filterArray;
    }
    this.filteredList = this.filterByCollection(this.collectionsWithCardImage, filterBy, filterValueItem);
    this.groupCollectionList();
  }

  getSharedContextObjectProperty(property) {
    if (property === 'channel') {
       return _.get(this.programContext, 'config.scope.channel');
    } else if ( property === 'topic' ) {
      return null;
    } else {
      const filters =  this.collectionComponentConfig.config.filters;
      const explicitProperty =  _.find(filters.explicit, {'code': property});
      const implicitProperty =  _.find(filters.implicit, {'code': property});
      return (implicitProperty) ? implicitProperty.range || implicitProperty.defaultValue :
       explicitProperty.range || explicitProperty.defaultValue;
    }
  }

  objectKey(obj) {
    return Object.keys(obj);
  }
  changeView() {
    if (!_.isEmpty(this.state.stages)) {
      this.currentStage  = _.last(this.state.stages).stage;
    }
  }

  searchCollection() {
    const req = {data: {request: { filters: ''}, }, url: ''};
    req.url = `${this.configService.urlConFig.URLS.COMPOSITE.SEARCH}`;
    req.data.request.filters = this.generateSearchFilterRequestData();
    return this.contentService.post(req)
      .pipe(
        catchError(err => {
          const errInfo = { errorMsg: 'Question creation failed' };
          this.showLoader = false;
          this.showError = true;
        return throwError(this.cbseService.apiErrorHandling(err, errInfo));
    }));
  }

  generateSearchFilterRequestData() {
    let payloadArray = [];
    payloadArray = [{
      objectType: 'content',
      programId: this.sessionContext.programId || this.programContext.program_id,
      status: this.sessionContext.collectionStatus || ['Draft', 'Live'],
      contentType: this.sessionContext.collectionType || 'Textbook'
    }];
    this.filters.forEach( (element) => {
      payloadArray[0][element['code']] = element['defaultValue'];
    });
    return payloadArray[0];
}

  groupCollectionList(groupValue?: string) {
    // if (groupValue) {
    //   this.collectionList = _.groupBy(this.collectionsWithCardImage, { 'subject' : groupValue } );
    // } else {
    //   this.collectionList = _.groupBy(this.filteredList, 'subject');
    // }

    this.collectionList = this.filteredList;
    console.log( this.filteredList);
  }

  addCardImage(collection) {
    collection.cardImg = collection.image;
    return collection;
  }


  checkArrayCondition(param) {
    // tslint:disable-next-line:max-line-length
    this.sharedContext[param] = _.isArray(this.sharedContext[param]) ? this.sharedContext[param] : _.split(this.sharedContext[param], ',');
  }

  viewMoreClickHandler(event) {
    console.log(event);
  }

  ngOnDestroy() {
    this.stageSubscription.unsubscribe();
  }

  ChangeUploadStatus(rowId) {
    this.nominate = rowId;
    this.nominate = 'uploadSample';
    // this.uploadSample = 'uploadSample';
  }

  nominationChecked(rowId) {
    if (_.includes(this.selectedCollectionIds, rowId)) {
      _.remove(this.selectedCollectionIds, (data) => {
        return data === rowId;
      });
    } else {
      this.selectedCollectionIds.push(rowId);
    }
    if (this.selectedCollectionIds.length > 0) {
      this.nominateButton = 'show';
    }
  }
  redirect() {

  }

  toggle(item: any) {
    if (_.includes(this.selectedContentTypes, item.value)) {
      _.remove(this.selectedContentTypes, (data) => {
        return data === item.value;
      });
    } else {
      this.selectedContentTypes.push(item.value);
    }
  }

  uploadSample(event, collection) {
    this.sharedContext = this.collectionComponentInput.programContext.config.sharedContext.reduce((obj, context) => {
      return {...obj, [context]: collection[context] || this.sharedContext[context]};
    }, this.sharedContext);

    _.forEach(['gradeLevel', 'medium', 'subject'], (val) => {
       this.checkArrayCondition(val);
    });
    this.sessionContext = _.assign(this.sessionContext, this.sharedContext);
    this.sessionContext.collection =  collection.metaData.identifier;
    this.sessionContext.collectionName = collection.name;
    this.collection = collection;
    this.chapterListComponentInput = {
      sessionContext: this.sessionContext,
      collection: this.collection,
      config: _.find(this.programContext.config.components, {'id': 'ng.sunbird.chapterList'}),
      programContext: this.programContext,
      role: this.role
    };
    this.programStageService.addStage('chapterListComponent');
    this.isCollectionSelected.emit(collection.metaData.identifier ? true : false);
  }

  addNomination() {
    this.showContentTypeModal = false;
    let creator = this.userService.userProfile.firstName;
    if (!_.isEmpty(this.userService.userProfile.lastName)) {
      creator = this.userService.userProfile.firstName + ' ' + this.userService.userProfile.lastName;
    }
    const req = {
      url: `program/v1/nomination/update`,
      data: {
        request: {
          program_id: this.activatedRoute.snapshot.params.programId,
          user_id: this.userService.userProfile.userId,
          status: 'Pending',
          content_types: this.selectedContentTypes,
          collection_ids: this.selectedCollectionIds,
          createdby: creator
        }
      }
    };
    this.programsService.post(req).subscribe((data) => {
      this.tosterService.success('Nomination sent');
      this.router.navigateByUrl('/contribute/myenrollprograms');
    }, error => {
      this.tosterService.error('User onboarding failed');
    });
  }

  expressIntrest() {

    let creator = this.userService.userProfile.firstName;
    if (!_.isEmpty(this.userService.userProfile.lastName)) {
      creator = this.userService.userProfile.firstName + ' ' + this.userService.userProfile.lastName;
    }
    const req = {
      url: `program/v1/nomination/add`,
      data: {
        request: {
          program_id: this.activatedRoute.snapshot.params.programId,
          user_id: this.userService.userProfile.userId,
          status: 'Initiated',
          collection_ids: this.selectedCollectionIds,
          createdby: creator
        }
      }
    };
    this.programsService.post(req).subscribe((data) => {
      this.tosterService.success('Express Intrest');
     // this.router.navigateByUrl('/contribute/myenrollprograms');
    }, error => {
      this.tosterService.error('User onboarding failed');
    });
  }


  checkOrgAdmin()
  {

    const option =
    {
        id : "open-saber.registry.search",
        request:
        {
            "entityType":["Org"],
            "filters":{
              "createdBy":{"eq":"8454cb21-3ce9-4e30-85b5-fade097880d8"}
            }
        }             
    }
    const httpOptions: HttpOptions = {
          headers: {
            'Content-Type' : "application/json",
            'Authorization' : ""
          }
        };
        this.http.post<any>("http://dock.sunbirded.org/api/reg/search", option, httpOptions).subscribe(
          (res) => {
            console.log(res, "thsis i the res")
            if (res && res.result.Org.length) {
              this.isOrgAdmin = true;
              }      
            }, 
          (err) => {
            console.log(err);
            const errorMes = typeof _.get(err, 'error.params.errmsg') === 'string' && _.get(err, 'error.params.errmsg');
          }
        );
  }
  checkIdividualUser()
  {
    const option =
    {
      id : "open-saber.registry.search",
      request:
      {
        "entityType":["User"],
        "filters":{
          "userId":{"eq":"8454cb21-3ce9-4e30-85b5-fade097880d8"}
        }
      }
    }
    const httpOptions: HttpOptions = {
          headers: {
            'Content-Type' : "application/json",
            'Authorization' : ""
          }
        };
        this.http.post<any>("http://dock.sunbirded.org/api/reg/search", option, httpOptions).subscribe(
          (res) => {
            if (res && res.result.User.length) {
              this.isIndividualUser = true;
              }      
            }, 
          (err) => {
            console.log(err);
            const errorMes = typeof _.get(err, 'error.params.errmsg') === 'string' && _.get(err, 'error.params.errmsg');
          }
        );
  }

  getNomination() {
    this.fetchNomination().subscribe((response) => {
      const statuses = _.get(response, 'result');
      if (statuses && statuses.length) {
         this.nominationStatus = statuses[0].status;
         this.ExpressIntrest = false;
      }  
    }, error => {
      // TODO: navigate to program list page
      const errorMes = typeof _.get(error, 'error.params.errmsg') === 'string' && _.get(error, 'error.params.errmsg');
      //this.toasterService.error(errorMes || 'Fetching program details failed');
    });
  }


  fetchNomination() {
    const req = {
      url: "program/v1/nomination/list",
      data: {
        request: {
          filters: {
            program_id: "31ab2990-7892-11e9-8a02-93c5c62c03f1",
            user_id: "8454cb21-3ce9-4e30-85b5-fade097880d8"
          },
          facets: ['program_id', 'user_id', 'status']
        }
      }
    };
    return this.programsService.post(req);
  }
}