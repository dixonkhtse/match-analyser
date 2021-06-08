import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component';
import { BasePageComponent } from './pages/base-page/base-page';
import { HeadToHeadComponent } from './pages/h2h/h2h';
import { MapStatsComponent } from './pages/map-stats/map-stats';

@NgModule({
  declarations: [
    AppComponent,
    BasePageComponent,
    HeadToHeadComponent,
    MapStatsComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule { }
