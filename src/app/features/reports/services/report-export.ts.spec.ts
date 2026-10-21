import { TestBed } from '@angular/core/testing';

import { ReportExportTs } from './report-export.ts';

describe('ReportExportTs', () => {
  let service: ReportExportTs;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReportExportTs);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
