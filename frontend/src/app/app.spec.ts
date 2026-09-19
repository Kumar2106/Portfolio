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

  it('should flag errors when submitting empty contact form', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    const mockEvent = new Event('submit');
    app['onSubmit'](mockEvent);

    expect(app['formErrors'].name()).toBe(true);
    expect(app['formErrors'].email()).toBe(true);
    expect(app['formErrors'].message()).toBe(true);
    expect(app['formStatus']()).toBe('idle');
  });

  it('should pass validation with valid contact inputs', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app['contactForm'].name.set('Jane Doe');
    app['contactForm'].email.set('jane@example.com');
    app['contactForm'].message.set('Excited to collaborate!');

    const mockEvent = new Event('submit');
    app['onSubmit'](mockEvent);

    expect(app['formErrors'].name()).toBe(false);
    expect(app['formErrors'].email()).toBe(false);
    expect(app['formErrors'].message()).toBe(false);
    expect(app['formStatus']()).toBe('sending');
  });
});
