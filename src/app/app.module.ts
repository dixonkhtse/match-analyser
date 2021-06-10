import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSortModule } from '@angular/material/sort';
import { AppComponent } from './app.component';
import { BasePageComponent } from './pages/base-page/base-page';
import { HeadToHeadComponent } from './pages/h2h/h2h';
import { MatchStatsComponent } from './pages/match-stats/match-stats';

@NgModule({
  declarations: [
    AppComponent,
    BasePageComponent,
    HeadToHeadComponent,
    MatchStatsComponent,
  ],
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    FormsModule,
    HttpClientModule,
    MatSortModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule { }
