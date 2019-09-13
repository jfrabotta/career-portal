import { Component, OnInit } from '@angular/core';
import {
  NovoFormGroup,
  FormUtils,
  NovoModalRef,
  NovoModalParams,
  TextBoxControl,
  FileControl,
  PickerControl,
  SelectControl,
  NovoToastService,
  CheckboxControl,
  FieldInteractionApi,
} from 'novo-elements';
import { TranslateService } from 'chomsky';
import { SettingsService } from '../../../services/settings/settings.service';
import { AnalyticsService } from '../../../services/analytics/analytics.service';
import { ApplyService } from '../../../services/apply/apply.service';

@Component({
  selector: 'app-apply-modal',
  templateUrl: './apply-modal.component.html',
  styleUrls: ['./apply-modal.component.scss'],
})
export class ApplyModalComponent implements OnInit {

  public job: any;
  public source: string;
  public firstName: TextBoxControl;
  public lastName: TextBoxControl;
  public email: TextBoxControl;
  public phoneNumber: TextBoxControl;
  public form: NovoFormGroup;
  public genderRaceEthnicity: any;
  public veteran: any;
  public disability: any;
  public resume: FileControl;
  public loading: boolean = true;
  public hasError: boolean = false;
  public formControls: any[] = [this.firstName, this.lastName, this.email, this.phoneNumber];
  public eeocControls: any = [];
  public consentControl: any;
  public applying: boolean = false;
  public privacyPolicyURL: string = SettingsService.settings.privacyConsent.privacyPolicyUrl;
  public consentCheckbox: boolean = SettingsService.settings.privacyConsent.consentCheckbox;
  public usePrivacyPolicyUrl: boolean = SettingsService.settings.privacyConsent.usePrivacyPolicyUrl;
  public privacyStatementParagraphs: string = SettingsService.settings.privacyConsent.privacyStatementParagraphs.join('\r\n');
  private APPLIED_JOBS_KEY: string = 'APPLIED_JOBS_KEY';

  constructor(private formUtils: FormUtils,
              public params: NovoModalParams,
              private modalRef: NovoModalRef,
              private applyService: ApplyService,
              private analytics: AnalyticsService,
              private toaster: NovoToastService ) { this.toaster.parentViewContainer = this.params['viewContainer']; }

  public ngOnInit(): void {
    this.job = this.params['job'];
    this.source = this.params['source'];
    this.setupForm();
  }
  public setupForm(): void {
    this.firstName = new TextBoxControl({
      key: 'firstName',
      label: TranslateService.translate('FIRST_NAME'),
      required: true,
      hidden: false,
      value: '',
    });
    this.lastName = new TextBoxControl({
      key: 'lastName',
      label: TranslateService.translate('LAST_NAME'),
      required: true,
      hidden: false,
      value: '',
    });
    this.email = new TextBoxControl({
      key: 'email',
      label: TranslateService.translate('EMAIL'),
      type: 'email',
      required: true,
      hidden: false,
      value: '',
    });
    this.phoneNumber = new TextBoxControl({
      key: 'phone',
      label: TranslateService.translate('PHONE'),
      type: 'tel',
      required: false,
      hidden: false,
      value: '',
    });
    this.genderRaceEthnicity = [
      new SelectControl({
        key: 'gender',
        label: 'Gender',
        required: SettingsService.settings.eeoc.genderRaceEthnicity,
        hidden: false,
        options: [
          { value: 'Male', label: 'Male' },
          { value: 'Female', label: 'Female'},
          { value: 'Unknown', label: 'I do not wish to self-identify'},
        ],
      }), new PickerControl({
        key: 'raceEthnicity',
        label: 'Ethnicity / Race',
        required: SettingsService.settings.eeoc.genderRaceEthnicity,
        hidden: false,
        multiple: true,
        placeholder: 'Select all that apply',
        config: {
          options: [
            { value: 'Hispanic or Latino', label: 'Hispanic or Latino' },
            { value: 'White', label: 'White'},
            { value: 'Black or African American', label: 'Black or African American'},
            { value: 'Asian', label: 'Asian' },
            { value: 'Native Hawaiian or Pacific Islander', label: 'Native Hawaiian or Pacific Islander'},
            { value: 'American Indian or Alaskan Native', label: 'American Indian or Alaskan Native'},
            { value: 'Unknown', label: 'I do not wish to self-identify'},
          ],
        },
      }),
    ];
    this.veteran = [
      new SelectControl({
        key: 'veteran',
        label: 'Veteran Status',
        required: SettingsService.settings.eeoc.veteran,
        hidden: false,
        options: [
          { value: 'Protected Veteran', label: 'Protected Veteran' },
          { value: 'Veteran', label: 'Veteran'},
          { value: 'Non-Veteran', label: 'Non-Veteran'},
          { value: 'Unknown', label: 'Decline to Answer'},
        ],
      }),
    ];
    this.disability = [
      new SelectControl({
        key: 'disability',
        label: 'Disability Status',
        required: SettingsService.settings.eeoc.disability,
        hidden: false,
        options: [
          { value: 'Disability', label: 'Disability' },
          { value: 'No Disability', label: 'No Disability'},
          { value: 'Unknown', label: 'I do not wish to self-identify'},
        ],
      }),
    ];
    this.resume = new FileControl({
      key: 'resume',
      required: true,
      hidden: false,
      description: `${TranslateService.translate('ACCEPTED_RESUME')} ${SettingsService.settings.acceptedResumeTypes.toString()}`,
    });

    this.formControls = [this.firstName, this.lastName, this.email, this.phoneNumber, this.resume];

    let eeoc: any = SettingsService.settings.eeoc;
    for (let field in eeoc) {
      if (eeoc[field]) {
        this.eeocControls.push(...this[field]);
      }
    }

    this.consentControl = new CheckboxControl({
      key: 'consent',
      required: SettingsService.settings.privacyConsent.consentCheckbox,
      hidden: false,
      description: 'By checking this box you\'re agreeing to ourPrivacy Policy',
      interactions: [
        {
          event: 'change',
          script: (FAPI: FieldInteractionApi) => {
            if (!FAPI.getValue('consent')) {
              FAPI.markAsInvalid('consent');
            }
          },
        },
      ],
    });

    this.form = this.formUtils.toFormGroup([...this.formControls, ...this.eeocControls, this.consentControl]);
    this.loading = false;
  }

  public close(): void {
    this.modalRef.close(undefined);
  }

  public save(): void {
    if (this.form.valid) {
      this.applying = true;
      this.analytics.trackEvent(`Apply to Job: ${this.job.id}`);
      let requestParams: any = {
        firstName: encodeURIComponent(this.form.value.firstName),
        lastName: encodeURIComponent(this.form.value.lastName),
        email: encodeURIComponent(this.form.value.email),
        phone: encodeURIComponent(this.form.value.phone || ''),
        format: this.form.value.resume[0].name.substring(this.form.value.resume[0].name.lastIndexOf('.') + 1),
      };

      if (this.form.value.gender) {
        requestParams.gender = encodeURIComponent(this.form.value.gender);
      }
      if (this.form.value.ethnicity) {
        requestParams.ethnicity = encodeURIComponent(this.form.value.ethnicity);
      }
      if (this.form.value.veteran) {
        requestParams.veteran = encodeURIComponent(this.form.value.veteran);
      }
      if (this.form.value.disability) {
        requestParams.disability = encodeURIComponent(this.form.value.disability);
      }
      if (this.source) {
        requestParams.source = this.source;
      }

      let formData: FormData = new FormData();
      formData.append('resume', this.form.value.resume[0].file);
      this.applyService.apply(this.job.id, requestParams, formData).subscribe(this.applyOnSuccess.bind(this), this.applyOnFailure.bind(this) );
    }
  }

  public viewPrivacyPolicy(): void {
    window.open(this.privacyPolicyURL);
  }

  private applyOnSuccess(res: any): void {
    let toastOptions: any = {
      theme: 'success',
      icon: 'check',
      title: TranslateService.translate('THANK_YOU'),
      message: TranslateService.translate('YOU_WILL_BE_CONTACTED'),
      position: 'growlTopRight',
      hideDelay: 3000,
    };
    this.toaster.alert(toastOptions);
    let alreadyAppliedJobs: any = sessionStorage.getItem(this.APPLIED_JOBS_KEY);
    if (alreadyAppliedJobs) {
      let alreadyAppliedJobsArray: any = JSON.parse(alreadyAppliedJobs);
      alreadyAppliedJobsArray.push(this.job.id);
      sessionStorage.setItem(this.APPLIED_JOBS_KEY, JSON.stringify(alreadyAppliedJobsArray));
    } else {
      sessionStorage.setItem(this.APPLIED_JOBS_KEY, JSON.stringify([this.job.id]));
    }
    this.applying = false;
    this.close();
  }

  private applyOnFailure(res: any): void {
    this.hasError = true;
    this.applying = false;
  }
}