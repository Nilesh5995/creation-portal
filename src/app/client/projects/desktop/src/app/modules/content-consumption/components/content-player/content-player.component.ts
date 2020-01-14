import { PublicPlayerService } from '@sunbird/public';
import { ConfigService, NavigationHelperService } from '@sunbird/shared';
import { Component, AfterViewInit, ViewChild, ElementRef, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import * as _ from 'lodash-es';
import { PlayerConfig } from '@sunbird/shared';
import { Router } from '@angular/router';
import { ToasterService, ResourceService } from '@sunbird/shared';
const OFFLINE_ARTIFACT_MIME_TYPES = ['application/epub', 'video/webm', 'video/mp4', 'application/pdf'];
import { Subject } from 'rxjs';
@Component({
  selector: 'app-content-player',
  templateUrl: './content-player.component.html',
  styleUrls: ['./content-player.component.scss']
})
export class ContentPlayerComponent implements AfterViewInit, OnChanges {
  @Input() playerConfig: PlayerConfig;
  @Output() assessmentEvents = new EventEmitter<any>();
  @Output() questionScoreSubmitEvents = new EventEmitter<any>();
  @ViewChild('contentIframe') contentIframe: ElementRef;
  @Output() playerOnDestroyEvent = new EventEmitter<any>();
  @Output() sceneChangeEvent = new EventEmitter<any>();
  @Input() contentProgressEvents$: Subject<any>;
  @Output() deletedContent = new EventEmitter();
  buildNumber: string;
  @Input() playerOption: any;
  contentRatingModal = false;
  previewCdnUrl: string;
  isCdnWorking: string;
  @Input() isContentDeleted: Subject<any>;
  contentDeleted = false;
  @Input() isContentPresent = true;
  @Input() objectRollUp: {} = {};
  CONSTANT = {
    ACCESSEVENT: 'renderer:question:submitscore'
  };
  /**
 * Dom element reference of contentRatingModal
 */
  @ViewChild('modal') modal;
  @Input() contentData;

  constructor(public configService: ConfigService, public router: Router, private toasterService: ToasterService,
    public resourceService: ResourceService, public navigationHelperService: NavigationHelperService,
    public playerService: PublicPlayerService) {
    this.buildNumber = (<HTMLInputElement>document.getElementById('buildNumber'))
      ? (<HTMLInputElement>document.getElementById('buildNumber')).value : '1.0';
    this.previewCdnUrl = (<HTMLInputElement>document.getElementById('previewCdnUrl'))
      ? (<HTMLInputElement>document.getElementById('previewCdnUrl')).value : undefined;
    this.isCdnWorking = (<HTMLInputElement>document.getElementById('cdnWorking'))
      ? (<HTMLInputElement>document.getElementById('cdnWorking')).value : 'no';
  }
  /**
   * loadPlayer method will be called
   */

  ngAfterViewInit() {
    if (!_.isEmpty(this.playerConfig)) {
      this.loadPlayer();
    }
  }

  ngOnChanges() {
    if (this.isContentDeleted) {
      this.isContentDeleted.subscribe(data => {
        this.contentDeleted = data.value && !this.router.url.includes('browse');
      });
    }
    this.contentRatingModal = false;
      if (!_.isEmpty(this.playerConfig)) {
        this.objectRollUp = _.get(this.playerConfig, 'context.objectRollup') || {};
        this.loadPlayer();
      }
  }
  loadCdnPlayer() {
    const iFrameSrc = this.configService.appConfig.PLAYER_CONFIG.cdnUrl + '&build_number=' + this.buildNumber;
    setTimeout(() => {
      const playerElement = this.contentIframe.nativeElement;
      playerElement.src = iFrameSrc;
      playerElement.onload = (event) => {
        try {
          this.adjustPlayerHeight();
          playerElement.contentWindow.initializePreview(this.playerConfig);
          playerElement.addEventListener('renderer:telemetry:event', telemetryEvent => this.generateContentReadEvent(telemetryEvent));
          window.frames['contentPlayer'].addEventListener('message', accessEvent => this.generateScoreSubmitEvent(accessEvent), false);
        } catch (err) {
          this.loadDefaultPlayer();
        }
      };
    }, 0);
  }
  loadDefaultPlayer(url = this.configService.appConfig.PLAYER_CONFIG.baseURL) {
    const iFrameSrc = url + '&build_number=' + this.buildNumber;
    setTimeout(() => {
      const playerElement = this.contentIframe.nativeElement;
      playerElement.src = iFrameSrc;
      playerElement.onload = (event) => {
        try {
          this.adjustPlayerHeight();
          playerElement.contentWindow.initializePreview(this.playerConfig);
          playerElement.addEventListener('renderer:telemetry:event', telemetryEvent => {
            this.generateContentReadEvent(telemetryEvent);
          });
          window.frames['contentPlayer'].addEventListener('message', accessEvent => this.generateScoreSubmitEvent(accessEvent), false);
        } catch (err) {
          const prevUrls = this.navigationHelperService.history;
          if (this.isCdnWorking.toLowerCase() === 'yes' && prevUrls[prevUrls.length - 2]) {
            history.back();
          }
        }
      };
    }, 0);
  }
  /**
   * Initializes player with given config and emits player telemetry events
   * Emits event when content starts playing and end event when content was played/read completely
   */
  loadPlayer() {
    if (_.includes(this.router.url, 'browse')) {
      this.loadDefaultPlayer(`${this.configService.appConfig.PLAYER_CONFIG.localBaseUrl}webview=true`);
      return;
    } else if (!_.includes(this.router.url, 'browse')) {
      if (_.get(this.playerConfig, 'metadata.artifactUrl')
      && _.includes(OFFLINE_ARTIFACT_MIME_TYPES, this.playerConfig.metadata.mimeType)) {
        const artifactFileName = this.playerConfig.metadata.artifactUrl.split('/');
        this.playerConfig.metadata.artifactUrl = artifactFileName[artifactFileName.length - 1];
      }
      this.loadDefaultPlayer(this.configService.appConfig.PLAYER_CONFIG.localBaseUrl);
      return;
    }

    if (this.previewCdnUrl !== '' && (this.isCdnWorking).toLowerCase() === 'yes') {
      this.loadCdnPlayer();
      return;
    }
    this.loadDefaultPlayer();
  }
  /**
   * Adjust player height after load
   */
  adjustPlayerHeight() {
    const playerWidth = $('#contentPlayer').width();
    if (playerWidth) {
      const height = playerWidth * (9 / 16);
      $('#contentPlayer').css('height', height + 'px');
    }
  }

  generateScoreSubmitEvent(event: any) {
    if (_.toLower(event.data) === (_.toLower(this.CONSTANT.ACCESSEVENT))) {
      this.questionScoreSubmitEvents.emit(event);
    }
  }

  generateContentReadEvent(event: any) {
    const eid = event.detail.telemetryData.eid;
    if (eid && (eid === 'START' || eid === 'END')) {
      this.contentProgressEvents$.next(event);
    } else if (eid && (eid === 'IMPRESSION')) {
      this.emitSceneChangeEvent();
    }
    if (eid && (eid === 'ASSESS') || eid === 'START' || eid === 'END') {
      this.assessmentEvents.emit(event);
    }
  }
  emitSceneChangeEvent(timer = 0) {
    setTimeout(() => {
      const stageId = this.contentIframe.nativeElement.contentWindow.EkstepRendererAPI.getCurrentStageId();
      const eventData = { stageId };
      this.sceneChangeEvent.emit(eventData);
    }, timer); // waiting for player to load, then fetching stageId (if we dont wait stageId will be undefined)
  }
  deleteContent(event) {
    if (!this.router.url.includes('browse')) {
      this.contentDeleted = true;
      this.deletedContent.emit(event);
    }
  }

  checkContentDownloading(event) {
    if (!this.router.url.includes('browse')) {
      this.contentDeleted = false;
      const contentDetails = {
        contentId: event.identifier,
        contentData: event
      };
      this.contentData = event;
      this.playerConfig = this.playerService.getConfig(contentDetails);
      if (!_.isEmpty(this.playerConfig)) {
        this.loadPlayer();
      }
    }
  }
}
