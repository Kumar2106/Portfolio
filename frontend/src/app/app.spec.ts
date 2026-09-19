import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Kumar Aditya');
  });

  it('should toggle mobile menu open/closed', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    
    // Default state
    expect(app['mobileMenuOpen']()).toBeFalsy();
    
    // Toggle menu
    app['toggleMobileMenu']();
    expect(app['mobileMenuOpen']()).toBeTruthy();
    
    // Close menu
    app['closeMobileMenu']();
    expect(app['mobileMenuOpen']()).toBeFalsy();
  });
});
