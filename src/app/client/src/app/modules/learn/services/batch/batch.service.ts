import { Injectable, Input } from '@angular/core';
import { ConfigService, ServerResponse } from '@sunbird/shared';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/throw';
import {SearchParam, LearnerService, UserService, ContentService, SearchService } from '@sunbird/core';

@Injectable()
export class BatchService {
  private _enrollBatchDetails: any;
  constructor(public searchService: SearchService, public user: UserService, public content: ContentService, public config: ConfigService,
    public learnerService: LearnerService) { }
  getAllBatchDetails(searchParams) {
    return this.batchSearch(searchParams);
  }
  getUserDetails(searchParams) {
    return this.getUserList(searchParams);
  }
  batchSearch(requestParam: SearchParam): Observable<ServerResponse> {
    const option = {
      url: this.config.urlConFig.URLS.BATCH.GET_BATCHS,
      data: {
        request: {
          filters: requestParam.filters,
          limit: requestParam.limit,
          sort_by: requestParam.sort_by
        }
      }
    };
    return this.learnerService.post(option);
  }
  getUserList(requestParam: SearchParam): Observable<ServerResponse> {
    const option = {
      url: this.config.urlConFig.URLS.ADMIN.USER_SEARCH,
      data: {
        request: {
          filters: requestParam.filters
        }
      }
    };
    return this.learnerService.post(option);
  }
  getBatchDetails(bathId) {
    const option = {
      url: `${this.config.urlConFig.URLS.BATCH.GET_DETAILS}/${bathId}`
    };
    return this.learnerService.get(option);
  }
  set enrollBatchDetails(enrollBatchDetails: any) {
    this._enrollBatchDetails = enrollBatchDetails;
  }
  getEnrollBatchDetails(bathId) {
    if (this._enrollBatchDetails && bathId === this._enrollBatchDetails.identifer) {
    }
  }

  createBatch(request) {
    const option = {
      url: this.config.urlConFig.URLS.BATCH.CREATE,
      data: {
        request: request
      }
    };
    return this.learnerService.post(option);
  }
}
