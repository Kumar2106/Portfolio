import { Component, signal, Inject, effect, computed, OnDestroy } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnDestroy {
  // Theme state
  protected readonly theme = signal<'dark' | 'light'>('dark');

  // Tech Stack Tabs
  protected readonly activeTab = signal<'backend' | 'cloud' | 'databases' | 'devops' | 'integrations'>('backend');

  // Playground Tab State
  protected readonly activePlaygroundTab = signal<'architecture' | 'calculator' | 'api' | 'pipeline'>('architecture');

  // --- Calculator Widget States ---
  protected readonly ec2Instances = signal<number>(8);
  protected readonly s3Storage = signal<number>(12); // in TB
  protected readonly auroraInstances = signal<number>(4);

  // Calculated Costs & Savings
  protected readonly unoptimizedCost = computed(() => {
    return (this.ec2Instances() * 144) + (this.s3Storage() * 23) + (this.auroraInstances() * 260);
  });
  
  protected readonly optimizedCost = computed(() => {
    // 28% AWS savings based on solutions architecture optimization rules
    return Math.round(this.unoptimizedCost() * 0.72);
  });

  protected readonly monthlySavings = computed(() => {
    return this.unoptimizedCost() - this.optimizedCost();
  });

  protected readonly annualSavings = computed(() => {
    return this.monthlySavings() * 12;
  });

  // --- API Playground States ---
  protected readonly apiEndpoint = signal<string>('/api/v1/profile');
  protected readonly apiLoading = signal<boolean>(false);
  protected readonly apiResponse = signal<string>('');

  // --- Pipeline Simulator States ---
  protected readonly pipelineStatus = signal<'idle' | 'running' | 'success'>('idle');
  protected readonly pipelineProgress = signal<number>(0);
  protected readonly pipelineLogs = signal<string[]>([]);
  protected readonly activeStage = signal<number>(0); // 0: Idle, 1: Lint, 2: Test, 3: Build, 4: Push, 5: Deploy

  private pipelineTimerRefs: any[] = [];

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

    // Populate initial API response
    this.updateApiResponse();
  }

  ngOnDestroy(): void {
    this.clearPipelineTimers();
  }

  // Toggle theme method
  protected toggleTheme(): void {
    this.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  // Method to set active tab
  protected setActiveTab(tab: 'backend' | 'cloud' | 'databases' | 'devops' | 'integrations'): void {
    this.activeTab.set(tab);
  }

  // Set active playground tab
  protected setActivePlaygroundTab(tab: 'architecture' | 'calculator' | 'api' | 'pipeline'): void {
    this.activePlaygroundTab.set(tab);
    if (tab === 'api') {
      this.updateApiResponse();
    }
  }

  // --- API Simulator Actions ---
  protected updateApiResponse(): void {
    const endpoint = this.apiEndpoint();
    let resObj = {};

    switch (endpoint) {
      case '/api/v1/profile':
        resObj = {
          status: 'success',
          data: {
            name: 'Kumar Aditya',
            experience: '4+ Years',
            role: 'Senior Java & Spring Boot Engineer',
            certifications: ['AWS Certified Solutions Architect - Associate'],
            interests: ['Backend Scaling', 'DevOps', 'Data Lakehouse Pipelines']
          }
        };
        break;
      case '/api/v1/skills':
        resObj = {
          status: 'success',
          data: {
            languages: ['Java', 'TypeScript', 'SQL', 'Bash'],
            backend: ['Spring Boot', 'Spring Cloud', 'Kafka', 'Redis'],
            databases: ['PostgreSQL', 'MongoDB', 'Apache Iceberg', 'Amazon Aurora', 'MS-SQL'],
            devops: ['AWS', 'Kubernetes', 'Docker', 'Jenkins', 'Terraform', 'GitHub Actions']
          }
        };
        break;
      case '/api/v1/experience':
        resObj = {
          status: 'success',
          data: {
            current: 'Senior Software Engineer at MindWise Technologies',
            previous: [
              'Software Engineer at MindWise Technologies',
              'Software Engineer at AppVin Technologies / Moove',
              'Software Engineer at CardByte',
              'Full-stack Developer at Azu'
            ]
          }
        };
        break;
    }

    this.apiResponse.set(JSON.stringify(resObj, null, 2));
  }

  protected triggerApiRequest(): void {
    this.apiLoading.set(true);
    setTimeout(() => {
      this.updateApiResponse();
      this.apiLoading.set(false);
    }, 600);
  }

  // --- DevOps Pipeline Actions ---
  protected triggerPipelineDemo(): void {
    this.clearPipelineTimers();
    this.pipelineStatus.set('running');
    this.pipelineProgress.set(0);
    this.pipelineLogs.set([]);
    this.activeStage.set(1);

    const logSteps = [
      { delay: 100, progress: 5, log: '➔ Starting Jenkins Pipeline run #412...' },
      { delay: 400, progress: 10, log: '➔ [STAGE 1] Code Linting: npm run lint' },
      { delay: 800, progress: 20, log: '  ✔ All source files formatted correctly.' },
      { delay: 1200, progress: 25, log: '➔ [STAGE 2] JUnit Tests: mvn clean test' },
      { delay: 1700, progress: 35, log: '  ✔ Running AppTestSuite (48 test cases)' },
      { delay: 2200, progress: 45, log: '  ✔ Tests passed successfully. [0.42s]' },
      { delay: 2600, progress: 50, log: '➔ [STAGE 3] Dockerize: docker build -t backend:latest .' },
      { delay: 3100, progress: 60, log: '  ✔ Step 1/4: FROM openjdk:21-slim' },
      { delay: 3500, progress: 68, log: '  ✔ Step 4/4: ENTRYPOINT ["java", "-jar", "app.jar"]' },
      { delay: 4000, progress: 75, log: '➔ [STAGE 4] Push ECR: docker push 102432.dkr.ecr.aws-east-1...' },
      { delay: 4600, progress: 85, log: '  ✔ Image backend:latest pushed to AWS Elastic Container Registry.' },
      { delay: 5100, progress: 90, log: '➔ [STAGE 5] Deploy ECS: aws ecs update-service --cluster prod-cluster --service web' },
      { delay: 5700, progress: 95, log: '  ✔ Desired task count running. Rolling update finished.' },
      { delay: 6300, progress: 100, log: '➔ Pipeline Run SUCCESSFUL. Deploy active at http://localhost:4200' }
    ];

    logSteps.forEach((step, idx) => {
      const timer = setTimeout(() => {
        this.pipelineProgress.set(step.progress);
        this.pipelineLogs.update(prev => [...prev, step.log]);
        
        // Update stage thresholds
        if (step.progress >= 90) {
          this.activeStage.set(5); // Deploy
        } else if (step.progress >= 70) {
          this.activeStage.set(4); // Push
        } else if (step.progress >= 50) {
          this.activeStage.set(3); // Build
        } else if (step.progress >= 25) {
          this.activeStage.set(2); // Test
        } else {
          this.activeStage.set(1); // Lint
        }

        // Complete pipeline
        if (idx === logSteps.length - 1) {
          this.pipelineStatus.set('success');
        }
      }, step.delay);

      this.pipelineTimerRefs.push(timer);
    });
  }

  private clearPipelineTimers(): void {
    this.pipelineTimerRefs.forEach(t => clearTimeout(t));
    this.pipelineTimerRefs = [];
  }

  // --- Contact Form Actions ---
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
