import { Injectable } from '@nestjs/common';

@Injectable()
export class PublicService {
  // In a real app, these would write to a PostgreSQL table (e.g. `ContactSubmissions` and `InstitutionApplications`)
  private contactForms: any[] = [];
  private applications: any[] = [];

  async submitContactForm(data: any) {
    const submission = {
      id: `c_${Date.now()}`,
      ...data,
      status: 'pending',
      createdAt: new Date(),
    };
    this.contactForms.push(submission);
    return { success: true, message: 'Contact form submitted successfully.', id: submission.id };
  }

  async submitApplication(data: any) {
    const application = {
      id: `app_${Date.now()}`,
      ...data,
      status: 'application_started', // Lead status
      createdAt: new Date(),
    };
    this.applications.push(application);
    return { success: true, message: 'Institution application submitted successfully.', id: application.id };
  }

  async getAllApplications() {
    return this.applications;
  }
}
