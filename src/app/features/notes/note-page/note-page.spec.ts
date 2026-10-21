import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotePage } from './note-page';

describe('NotePage', () => {
  let component: NotePage;
  let fixture: ComponentFixture<NotePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotePage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
