import { NgModule } from '@angular/core';
import { ErrorPageComponent, AuthGuard } from '@sunbird/core';
import { RouterModule, Routes } from '@angular/router';
const appRoutes: Routes = [
  {
    path: 'resources', loadChildren: 'app/modules/resource/resource.module#ResourceModule'
  },
  {
    path: 'search', loadChildren: 'app/modules/search/search.module#SearchModule'
  },
  {
    path: 'sourcing', loadChildren: 'app/modules/program/program.module#ProgramModule'
  },
  {
    path: 'contribute', loadChildren: 'app/modules/contribute/contribute.module#ContributeModule'
  },
  // {
  //   path: 'home', loadChildren: 'app/modules/home/home.module#HomeModule'
  // },
  {
    path: 'announcement', loadChildren: 'app/modules/announcement/announcement.module#AnnouncementModule'
  },
  {
    path: 'org', loadChildren: 'app/modules/org-management/org-management.module#OrgManagementModule'
  },
  {
    path: 'dashBoard', loadChildren: 'app/modules/dashboard/dashboard.module#DashboardModule'
  },
  {
    path: 'profile', loadChildren: 'app/plugins/profile/profile.module#ProfileModule'
  },
  {
    path: 'certs', loadChildren: 'app/modules/certificate/certificate.module#CertificateModule'
  },
  {
    path: 'recover', loadChildren: 'app/modules/recover-account/recover-account.module#RecoverAccountModule'
  },
  {
    path: 'accountMerge', loadChildren: 'app/modules/merge-account/merge-account.module#MergeAccountModule'
  },
  {
    path: ':slug/get', loadChildren: 'app/modules/dial-code-search/dial-code-search.module#DialCodeSearchModule'
  },
  {
    path: 'get', loadChildren: 'app/modules/dial-code-search/dial-code-search.module#DialCodeSearchModule'
  },
  {
    path: 'contribution-portal', loadChildren: 'app/modules/public/public.module#PublicModule'
  },
  {
    path: 'contribute/join/:orgId', loadChildren: 'app/modules/contribute/contribute.module#ContributeModule'
  },
  {
    path: '', loadChildren: 'app/modules/public/public.module#PublicModule'
  },
  {
    path: 'error', component: ErrorPageComponent
  },
  {
    path: '**', redirectTo: ''
  }
];

@NgModule({
  imports: [RouterModule.forRoot(appRoutes, {scrollPositionRestoration: 'top'})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
