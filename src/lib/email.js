import emailjs from '@emailjs/browser'

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

const STATUS_SUBJECTS = {
  reviewed: 'Your application has been reviewed',
  shortlisted: 'Congratulations! You have been shortlisted',
  interview: 'You are invited for an interview',
  offered: 'Congratulations! You have received a job offer',
  rejected: 'Update on your application',
  new_job_alert: 'New job matching your skills!',
}

const STATUS_MESSAGES = {
  reviewed: 'We wanted to let you know that your application has been reviewed by the hiring team. We will keep you updated on the next steps.',
  shortlisted: 'Great news! After careful review, you have been shortlisted for the next round. The recruiter will reach out to you shortly with further details.',
  interview: 'We are pleased to inform you that you have been selected for an interview. Please check your dashboard for details and prepare accordingly.',
  offered: 'We are thrilled to inform you that you have been selected for this position! Please check your dashboard for the offer details.',
  rejected: 'Thank you for your interest and the time you invested in applying. After careful consideration, we have decided to move forward with other candidates. We encourage you to keep applying to other opportunities.',
  new_job_alert: 'A new job matching your skills has been posted on PlaceMate! Log in to view the details and apply before the deadline. Your skills are in demand — don\'t miss this opportunity!',
}

export async function sendStatusEmail({ candidateEmail, candidateName, jobTitle, companyName, newStatus }) {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.warn('EmailJS not configured — skipping email')
    return false
  }

  if (!STATUS_SUBJECTS[newStatus]) return false

  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      to_email: candidateEmail,
      to_name: candidateName,
      subject: STATUS_SUBJECTS[newStatus],
      job_title: jobTitle,
      company_name: companyName,
      status: newStatus.charAt(0).toUpperCase() + newStatus.slice(1),
      message: STATUS_MESSAGES[newStatus],
    }, PUBLIC_KEY)
    return true
  } catch (err) {
    console.error('Email send failed:', err)
    return false
  }
}
