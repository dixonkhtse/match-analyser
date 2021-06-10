import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-base-page',
  templateUrl: './base-page.html',
  styleUrls: ['./base-page.scss']
})
export class BasePageComponent {
  @Input() processing = false;
  @Input() hasOutput = false;

  constructor() { }
}
