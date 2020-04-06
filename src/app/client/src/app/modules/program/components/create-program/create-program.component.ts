import { ConfigService, ResourceService, ToasterService, RouterNavigationService,
  ServerResponse, NavigationHelperService } from '@sunbird/shared';
import { ProgramsService, DataService, FrameworkService } from '@sunbird/core';
import { Subscription, Subject } from 'rxjs';
import { tap, first, map, takeUntil } from 'rxjs/operators';
import { Component, OnInit, AfterViewInit } from '@angular/core';
import * as _ from 'lodash-es';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormBuilder, Validators, FormGroup, FormArray } from '@angular/forms';
import { IProgram } from './../../../core/interfaces';
import { UserService } from '@sunbird/core';
import { programConfigObj } from './programconfig';
import { HttpClient } from '@angular/common/http';
import { IImpressionEventInput, IInteractEventEdata, IStartEventInput, IEndEventInput } from '@sunbird/telemetry';
import { DeviceDetectorService } from 'ngx-device-detector';
import * as moment from 'moment';
import * as alphaNumSort from 'alphanum-sort';

@Component({
 selector: 'app-create-program',
 templateUrl: './create-program.component.html',
 styleUrls: ['./create-program.component.scss']
})

export class CreateProgramComponent implements OnInit, AfterViewInit {
 public unsubscribe = new Subject<void>();

 /**
  * Program creation form name
  */
 createProgramForm: FormGroup;
 collectionListForm: FormGroup;

 sbFormBuilder: FormBuilder;

 /**
  * Contains Program form data
  */
 programDetails: IProgram;


 /**
 * To call resource service which helps to use language constant
 */
 public resourceService: ResourceService;

 /**
 * To navigate back to parent component
 */
 public routerNavigationService: RouterNavigationService;

 /**
 * List of textbooks for the program by BMGC
 */
 collections;
 tempCollections = [];
 /**
 * List of textbooks for the program by BMGC
 */
  private userFramework;
  private userBoard;
  frameworkCategories;
  programScope: any = {};
  originalProgramScope: any = {};
  userprofile;
  programId: string;
  public programData: any = {};
  showTextBookSelector = false;
  formIsInvalid = false;
  subjectsOption = [];
  mediumOption = [];
  gradeLevelOption = [];
  pickerMinDate = new Date(new Date().setHours(0, 0, 0, 0));
  pickerMinDateForEndDate = new Date(new Date().setHours(0, 0, 0, 0));
  public telemetryImpression: IImpressionEventInput;
  public telemetryInteractCdata: any;
  public telemetryInteractPdata: any;
  public telemetryInteractObject: any;
  public telemetryStart: IStartEventInput;
  public telemetryEnd: IEndEventInput;
  public sortColumn = 'name';
  public direction = 'asc';
  public tempSortCollections = [];

 constructor(
   public frameworkService: FrameworkService,
   private programsService: ProgramsService,
   private userService: UserService,
   public toasterService: ToasterService,
   public resource: ResourceService,
   private config: ConfigService,
   private activatedRoute: ActivatedRoute,
   private router: Router,
   private formBuilder: FormBuilder,
   private httpClient: HttpClient,
   private navigationHelperService: NavigationHelperService,
   private configService: ConfigService,
   private deviceDetectorService: DeviceDetectorService) {
   this.sbFormBuilder = formBuilder;
 }

 sortCollections(column) {
  if (!this.tempSortCollections.length) {
    return;
  }

  if (this.direction === 'asc' || this.direction === '') {
    this.collections = this.tempSortCollections.sort((a, b) => {
      return this.sort(b, a, column);
    });
    this.direction = 'desc';
  } else {
    this.collections =  this.tempSortCollections.sort((a, b) => {
      return this.sort(a, b, column);
    });
    this.direction = 'asc';
  }
  this.sortColumn = column;
 }

 isNotEmpty(obj, key) {
  if (_.isEmpty(obj) || _.isEmpty(obj[key])) {
    return false;
  }
  return true;
 }

 sort(a, b, column) {
  if (!this.isNotEmpty(a, column) || !this.isNotEmpty(b, column)) {
    return 1;
  }
  let aColumn = a[column];
  let bColumn = b[column];
  if (_.isArray(aColumn)) {
    aColumn = _.join(aColumn, ', ');
    a[column] = alphaNumSort(aColumn);
  }
  if (_.isArray(bColumn)) {
    bColumn = _.join(bColumn, ', ');
    b[column] = alphaNumSort(bColumn);
  }
  return bColumn.localeCompare(aColumn);
 }

 getMaxDate(date) {
  if (date === 'nomination_enddate') {
    if (this.createProgramForm.value.shortlisting_enddate) {
      return this.createProgramForm.value.shortlisting_enddate;
    }
  }

  if (date === 'shortlisting_enddate') {
    if (this.createProgramForm.value.content_submission_enddate) {
      return this.createProgramForm.value.content_submission_enddate;
    }
  }

  return this.createProgramForm.value.program_end_date;
 }

 getMinDate(date) {
  if (date === 'shortlisting_enddate') {
    if (this.createProgramForm.value.nomination_enddate) {
      return this.createProgramForm.value.nomination_enddate;
    }
  }

  if (date === 'content_submission_enddate') {
    if (this.createProgramForm.value.shortlisting_enddate) {
      return this.createProgramForm.value.shortlisting_enddate;
    }

    if (this.createProgramForm.value.nomination_enddate) {
      return this.createProgramForm.value.nomination_enddate;
    }
  }

  if (date === 'program_end_date') {
    if (this.createProgramForm.value.content_submission_enddate) {
      return this.createProgramForm.value.content_submission_enddate;
    }

    if (this.createProgramForm.value.shortlisting_enddate) {
      return this.createProgramForm.value.shortlisting_enddate;
    }

    if (this.createProgramForm.value.nomination_enddate) {
      return this.createProgramForm.value.nomination_enddate;
    }
  }

  return this.pickerMinDate;
 }

 ngOnInit() {
  this.userprofile = this.userService.userProfile;
  this.initializeFormFields();
  this.fetchFrameWorkDetails();
  this.getProgramContentTypes();
  this.telemetryInteractCdata = [];
  this.telemetryInteractPdata = {id: this.userService.appId, pid: this.configService.appConfig.TELEMETRY.PID};
  this.telemetryInteractObject = {};
 }

 ngAfterViewInit() {
  const buildNumber = (<HTMLInputElement>document.getElementById('buildNumber'));
  const version = buildNumber && buildNumber.value ? buildNumber.value.slice(0, buildNumber.value.lastIndexOf('.')) : '1.0';
  const deviceId = <HTMLInputElement>document.getElementById('deviceId');
   setTimeout(() => {
    this.telemetryImpression = {
      context: {
        env: this.activatedRoute.snapshot.data.telemetry.env,
        cdata: [],
        pdata: {
          id: this.userService.appId,
          ver: version,
          pid: this.config.appConfig.TELEMETRY.PID
        },
        did: deviceId ? deviceId.value : ''
      },
      edata: {
        type: _.get(this.activatedRoute, 'snapshot.data.telemetry.type'),
        pageid: _.get(this.activatedRoute, 'snapshot.data.telemetry.pageid'),
        uri: this.router.url,
        duration: this.navigationHelperService.getPageLoadTime()
      }
    };
   });
 }

 fetchFrameWorkDetails() {
   if (_.get(this.userprofile.framework, 'id')) {
    this.userFramework = _.get(this.userprofile.framework, 'id')[0];
    this.frameworkService.getFrameworkCategories(_.get(this.userprofile.framework, 'id')[0])
    .pipe(takeUntil(this.unsubscribe))
    .subscribe((data) => {
      if (data && _.get(data, 'result.framework.categories')) {
        this.frameworkCategories = _.get(data, 'result.framework.categories');
      }
      this.setFrameworkDataToProgram();
    }, error => {
      const errorMes = typeof _.get(error, 'error.params.errmsg') === 'string' && _.get(error, 'error.params.errmsg');
      this.toasterService.warning(errorMes || 'Fetching framework details failed');
    });
   } else {
    this.frameworkService.initialize();
    this.frameworkService.frameworkData$.pipe(first()).subscribe((frameworkInfo: any) => {
      if (frameworkInfo && !frameworkInfo.err) {
        this.userFramework = frameworkInfo.frameworkdata.defaultFramework.identifier;
        this.frameworkCategories  = frameworkInfo.frameworkdata.defaultFramework.categories;
      }
      this.setFrameworkDataToProgram();
    });
   }
 }

 setFrameworkDataToProgram() {
  this.programScope['medium'] = [];
  this.programScope['gradeLevel'] = [];
  this.programScope['subject'] = [];

  this.collectionListForm.controls['medium'].setValue('');
  this.collectionListForm.controls['gradeLevel'].setValue('');
  this.collectionListForm.controls['subject'].setValue('');

  const board = _.find(this.frameworkCategories, (element) => {
    return element.code === 'board';
  });

  this.userBoard = board.terms[0].name;

  if (_.get(this.userprofile.framework, 'board')) {
    this.userBoard = this.userprofile.framework.board[0];
  }

  this.frameworkCategories.forEach((element) => {
    const sortedArray = alphaNumSort(_.reduce(element['terms'], (result, value) => {
      result.push(value['name']);
      return result;
    }, []));
    const sortedTermsArray = _.map(sortedArray, (name) => {
      return _.find(element['terms'], {name: name});
    });
    this.programScope[element['code']] = sortedTermsArray;
    this.originalProgramScope[element['code']] = sortedTermsArray;
  });

  const Kindergarten = _.remove(this.programScope['gradeLevel'], (item) => {
    return item.name === 'Kindergarten';
  });
  this.programScope['gradeLevel'] = [...Kindergarten, ...this.programScope['gradeLevel']];

  const mediumOption = this.programsService.getAssociationData(board.terms, 'medium', this.frameworkCategories);

  if (mediumOption.length) {
    this.programScope['medium'] = mediumOption;
  }
 }

 onMediumChange() {
   // const thisClassOption = this.createProgramForm.value.gradeLevel;

   /*this.programScope['gradeLevel'] = [];
   this.programScope['subject'] = [];*/
   this.collectionListForm.controls['gradeLevel'].setValue('');
   this.collectionListForm.controls['subject'].setValue('');

   if (!_.isEmpty(this.collectionListForm.value.medium)) {
     // tslint:disable-next-line: max-line-length
     const classOption = this.programsService.getAssociationData(this.collectionListForm.value.medium, 'gradeLevel', this.frameworkCategories);

     if (classOption.length) {
       this.programScope['gradeLevel'] = classOption;
     }

     this.onClassChange();
   } else {
    this.programScope['gradeLevel'] = this.originalProgramScope['gradeLevel'];
   }
 }

 onClassChange() {
   // const thisSubjectOption = this.createProgramForm.value.subject;
   // this.programScope['subject'] = [];
   this.collectionListForm.controls['subject'].setValue('');

   if (!_.isEmpty(this.collectionListForm.value.gradeLevel)) {

     // tslint:disable-next-line: max-line-length
     const subjectOption = this.programsService.getAssociationData(this.collectionListForm.value.gradeLevel, 'subject', this.frameworkCategories);

     if (subjectOption.length) {
       this.programScope['subject'] = subjectOption;
     }
   } else {
    this.programScope['subject'] = this.originalProgramScope['subject'];
   }
 }

 /**
  * Executed when user come from any other page or directly hit the url
  *
  * It helps to initialize form fields and apply field level validation
  */
 initializeFormFields(): void {
   this.createProgramForm = this.sbFormBuilder.group({
     name: ['', [Validators.required, Validators.maxLength(100)]],
     description: ['', Validators.maxLength(1000)],
     nomination_enddate: ['', Validators.required],
     shortlisting_enddate: [],
     program_end_date: ['', Validators.required],
     content_submission_enddate: ['', Validators.required],
     content_types: ['', Validators.required],
     rewards: [],
     /*medium: ['', Validators.required],
     gradeLevel: ['', Validators.required],
     subject: ['', Validators.required],*/
   });

   this.collectionListForm = this.sbFormBuilder.group({
     pcollections: this.sbFormBuilder.array([]),
     medium: [],
     gradeLevel: [],
     subject: [],
   });
   /*this.createProgramForm.patchValue({
     rootorg_id: this.userprofile.rootOrgId
   });*/
 }

 getProgramContentTypes () {
   const option = {
     url: 'program/v1/contenttypes/list',
   };

   this.programsService.get(option).subscribe(
     (res) => {
         this.programScope['purpose'] = res.result.contentType;
       },
     (err) => {
       console.log(err);
       // TODO: navigate to program list page
       const errorMes = typeof _.get(err, 'error.params.errmsg') === 'string' && _.get(err, 'error.params.errmsg');
       this.toasterService.warning(errorMes || 'Fetching content types failed');
     }
   );

 }

 saveProgramError(err) {
   console.log(err);
 }

 validateAllFormFields(formGroup: FormGroup) {
   Object.keys(formGroup.controls).forEach(field => {
     const control = formGroup.get(field);
     control.markAsTouched();
   });
 }

 navigateTo(stepNo) {
   this.showTextBookSelector = false;
 }

 validateDates() {
    let hasError = false;
    const formData = this.createProgramForm.value;
    const nominationEndDate = moment(formData.nomination_enddate);
    const contentSubmissionEndDate = moment(formData.content_submission_enddate);
    const programEndDate = moment(formData.program_end_date);
    const today = moment(moment().format('YYYY-MM-DD'));

    // nomination date should be >= today
    if (!nominationEndDate.isSameOrAfter(today)) {
      this.toasterService.error(this.resource.messages.emsg.createProgram.m0001);
      hasError = true;
    }

    if (!_.isEmpty(formData.shortlisting_enddate)) {
      const shortlistingEndDate = moment(formData.shortlisting_enddate);

      // shortlisting date should be >= nomination date
      if (!shortlistingEndDate.isSameOrAfter(nominationEndDate)) {
        this.toasterService.error(this.resource.messages.emsg.createProgram.m0002);
        hasError = true;
      }
      // submission date should be >= shortlisting date
      if (!contentSubmissionEndDate.isSameOrAfter(shortlistingEndDate)) {
        this.toasterService.error(this.resource.messages.emsg.createProgram.m0003);
        hasError = true;
      }
    } else {
      if (!contentSubmissionEndDate.isSameOrAfter(nominationEndDate)) {
        this.toasterService.error(this.resource.messages.emsg.createProgram.m0005);
        hasError = true;
      }
    }

    // end date should be >= submission date
    if (!programEndDate.isSameOrAfter(contentSubmissionEndDate)) {
      this.toasterService.error(this.resource.messages.emsg.createProgram.m0004);
      hasError = true;
    }

    return hasError;
  }

  resetSorting() {
    this.sortColumn = 'name';
    this.direction = 'asc';
  }

 resetFilters () {
    this.collectionListForm.controls['medium'].setValue('');
    this.collectionListForm.controls['gradeLevel'].setValue('');
    this.collectionListForm.controls['subject'].setValue('');
    this.showTexbooklist();
 }

 handleContentTypes() {
   const contentTypes = this.createProgramForm.value.content_types;
   let configContentTypes = _.get(_.find(programConfigObj.components, {id: 'ng.sunbird.chapterList'}), 'config.contentTypes.value');
   configContentTypes = _.filter(configContentTypes, (type) => {
     return _.includes(contentTypes, type.metadata.contentType);
   });
   _.find(programConfigObj.components, {id: 'ng.sunbird.chapterList'}).config.contentTypes.value = configContentTypes;
 }

 saveProgram() {
   this.formIsInvalid = false;
   this.handleContentTypes();

   if (this.createProgramForm.dirty && this.createProgramForm.valid) {
    const contentTypes = this.createProgramForm.value.content_types;
    this.createProgramForm.value.content_types = _.isEmpty(contentTypes) ?  [] : contentTypes;
    this.programData = {
       ...this.createProgramForm.value
     };
     this.programData['sourcing_org_name'] = this.userprofile.rootOrgName;
     this.programData['rootorg_id'] = this.userprofile.rootOrgId;
     this.programData['createdby'] = this.userprofile.id;
     this.programData['createdon'] = new Date();
     this.programData['startdate'] = new Date();
     this.programData['slug'] = 'sunbird';
     this.programData['type'] = 'public',

     this.programData['default_roles'] = ['CONTRIBUTOR'];
     this.programData['enddate'] = this.programData.program_end_date;
     this.programData['config'] = programConfigObj;
     delete this.programData.gradeLevel;
     delete this.programData.medium;
     delete this.programData.subject;
     delete this.programData.program_end_date;

     if (!this.programId) {
      this.programData['status'] = 'Draft';
       this.programsService.createProgram(this.programData).subscribe(
         (res) => {
           this.programId = res.result.program_id;
           this.programData['program_id'] = this.programId;
            this.showTexbooklist();
            this.generateTelemetryEvent('START');
          },
         (err) => this.saveProgramError(err)
       );
     } else {
      this.programData['program_id'] = this.programId;
       this.programsService.updateProgram(this.programData).subscribe(
         (res) => { this.showTexbooklist(); },
         (err) => this.saveProgramError(err)
       );
     }
   } else {
     this.formIsInvalid = true;
     this.validateAllFormFields(this.createProgramForm);
   }

   this.validateDates();
 }

 showTexbooklist() {
   const requestData =  {
     request: {
       filters: {
         objectType: 'content',
         status: ['Draft'],
         contentType: 'Textbook',
         framework: this.userFramework,
         board: this.userBoard,
       },
       not_exists: ['programId']
     }
   };

   if (!_.isEmpty(this.collectionListForm.value.medium)) {
     requestData.request.filters['medium'] = [];
     _.forEach(this.collectionListForm.value.medium, (medium) => {
       requestData.request.filters['medium'].push(medium.name);
     });
   }

   if (!_.isEmpty(this.collectionListForm.value.gradeLevel)) {
     requestData.request.filters['gradeLevel'] = [];
     _.forEach(this.collectionListForm.value.gradeLevel, (gradeLevel) => {
       requestData.request.filters['gradeLevel'].push(gradeLevel.name);
     });
   }

   if (!_.isEmpty(this.collectionListForm.value.subject)) {
     requestData.request.filters['subject'] = this.collectionListForm.value.subject;
   }

   return this.programsService.getCollectionList(requestData).subscribe(
     (res) => {
       this.showTextBookSelector = true;
       if (res.result.count) {
        this.collections = res.result.content; 
        this.tempSortCollections = this.collections;
        this.resetSorting();
        this.sortCollections(this.sortColumn);
       } else {
        this.collections = [];
        this.tempSortCollections = [];
       }
     },
     (err) => {
       console.log(err);
       // TODO: navigate to program list page
       const errorMes = typeof _.get(err, 'error.params.errmsg') === 'string' && _.get(err, 'error.params.errmsg');
       this.toasterService.warning(errorMes || 'Fetching textbooks failed');
     }
   );
 }

 onCollectionCheck(collection, isChecked: boolean) {
   const pcollectionsFormArray = <FormArray>this.collectionListForm.controls.pcollections;
   const collectionId = collection.identifier;

   if (isChecked) {
     pcollectionsFormArray.push(new FormControl(collectionId));
     this.tempCollections.push(collection);
   } else {
     const index = pcollectionsFormArray.controls.findIndex(x => x.value === collectionId);
     pcollectionsFormArray.removeAt(index);

     const cindex = this.tempCollections.findIndex(x => x.identifier === collectionId);
     this.tempCollections.splice(cindex, 1);
   }
 }

 updateProgramCollection() {
   if (_.isEmpty(this.collectionListForm.value.pcollections)) {
     this.toasterService.warning('Please select at least a textbook');
     return false;
   }

   const requestData = {
     'program_id': this.programId,
     'collections': this.collectionListForm.value.pcollections,
     'allowed_content_types': this.programData.content_types,
     'channel': 'sunbird'
   };

   this.programsService.copyCollectionForPlatform(requestData).subscribe(
     (res) => { this.addCollectionsToProgram(); },
     (err) => {
       console.log(err);
       // TODO: navigate to program list page
       const errorMes = typeof _.get(err, 'error.params.errmsg') === 'string' && _.get(err, 'error.params.errmsg');
       this.toasterService.warning(errorMes || 'Fetching textbooks failed');
     }
   );
 }

 addCollectionsToProgram() {
   _.forEach(this.tempCollections, (collection) => {

     if (this.mediumOption.indexOf(collection.medium) === -1) {
       this.mediumOption.push(collection.medium);
     }
     if (this.subjectsOption.indexOf(collection.subject) === -1) {
       this.subjectsOption.push(collection.subject);
     }

     _.forEach(collection.gradeLevel, (single) => {
       if (this.gradeLevelOption.indexOf(single) === -1) {
         this.gradeLevelOption.push(single);
       }
     });
   });

   const data = {};
   data['program_id'] = this.programId;
   data['collection_ids'] = this.collectionListForm.value.pcollections;

   programConfigObj.board = this.userBoard;
   programConfigObj.gradeLevel = this.gradeLevelOption;
   programConfigObj.medium = this.mediumOption;
   programConfigObj.subject = this.subjectsOption;
   data['config'] = programConfigObj;
   data['status'] = 'Live';

   this.programsService.updateProgram(data).subscribe(
     (res) => { this.router.navigate(['/sourcing']); this.generateTelemetryEvent('END'); },
     (err) => this.saveProgramError(err)
   );
 }
 getTelemetryInteractEdata(id: string, type: string, pageid: string, extra?: string): IInteractEventEdata {
  return _.omitBy({
    id,
    type,
    pageid,
    extra
  }, _.isUndefined);
 }

 generateTelemetryEvent(event) {
  switch (event) {
    case 'START':
     const deviceInfo = this.deviceDetectorService.getDeviceInfo();
     this.telemetryStart = {
       context: {
         env: this.activatedRoute.snapshot.data.telemetry.env
       },
       object: {
         id: this.programId || '',
         type: this.activatedRoute.snapshot.data.telemetry.object.type,
         ver: this.activatedRoute.snapshot.data.telemetry.object.ver
       },
       edata: {
         type: this.activatedRoute.snapshot.data.telemetry.type || '',
         pageid: this.activatedRoute.snapshot.data.telemetry.pageid || '',
         mode: this.activatedRoute.snapshot.data.telemetry.mode || '',
         uaspec: {
           agent: deviceInfo.browser,
           ver: deviceInfo.browser_version,
           system: deviceInfo.os_version,
           platform: deviceInfo.os,
           raw: deviceInfo.userAgent
         }
       }
     };
      break;
    case 'END':
     this.telemetryEnd = {
       object: {
         id: this.programId || '',
         type: this.activatedRoute.snapshot.data.telemetry.object.type,
         ver: this.activatedRoute.snapshot.data.telemetry.object.ver
       },
       context: {
         env: this.activatedRoute.snapshot.data.telemetry.env
       },
       edata: {
         type: this.activatedRoute.snapshot.data.telemetry.type,
         pageid: this.activatedRoute.snapshot.data.telemetry.pageid,
         mode: 'create'
       }
     };
      break;
    default:
      break;
  }
 }
}
