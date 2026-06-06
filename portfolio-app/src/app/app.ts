import { Component, signal, Inject, effect } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  // Theme state
  protected readonly theme = signal<'dark' | 'light'>('dark');

  // Tech Stack Tabs
  protected readonly activeTab = signal<'backend' | 'cloud' | 'databases' | 'devops' | 'integrations'>('backend');

  // Contact Form Model
  protected readonly contactForm = {
    name: signal(''),
    email: signal(''),
    message: signal('')
  };

  // Form submission status
  protected readonly formStatus = signal<'idle' | 'sending' | 'success' | 'error'>('idle');
  protected readonly formErrors = {
    name: signal(false),
    email: signal(false),
    message: signal(false)
  };

  constructor(@Inject(DOCUMENT) private document: Document) {
    // Sync theme signal to body class
    effect(() => {
      const currentTheme = this.theme();
      const body = this.document.body;
      if (currentTheme === 'light') {
        body.classList.add('light-theme');
      } else {
        body.classList.remove('light-theme');
      }
    });
  }

  // Toggle theme method
  protected toggleTheme(): void {
    this.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  // Method to set active tab
  protected setActiveTab(tab: 'backend' | 'cloud' | 'databases' | 'devops' | 'integrations'): void {
    this.activeTab.set(tab);
  }

  // Handle Form Submission
  protected onSubmit(event: Event): void {
    event.preventDefault();
    
    // Reset status & errors
    this.formStatus.set('idle');
    this.formErrors.name.set(false);
    this.formErrors.email.set(false);
    this.formErrors.message.set(false);

    let hasErrors = false;

    // Basic Validation
    if (!this.contactForm.name().trim()) {
      this.formErrors.name.set(true);
      hasErrors = true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.contactForm.email().trim() || !emailRegex.test(this.contactForm.email())) {
      this.formErrors.email.set(true);
      hasErrors = true;
    }

    if (!this.contactForm.message().trim()) {
      this.formErrors.message.set(true);
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    // Trigger sending simulation
    this.formStatus.set('sending');

    setTimeout(() => {
      // Success simulation
      this.formStatus.set('success');
      
      // Reset inputs
      this.contactForm.name.set('');
      this.contactForm.email.set('');
      this.contactForm.message.set('');
    }, 1500);
  }
}
