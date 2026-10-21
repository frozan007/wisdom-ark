import { TestBed } from '@angular/core/testing';

import { ProfileState } from './profile-state';

describe('ProfileState', () => {
  let service: ProfileState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProfileState);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
