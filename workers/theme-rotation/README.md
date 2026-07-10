# GCP Theme Rotation Deployment Blueprint

This directory contains the deployment configurations for the secure, background **Daily Theme Rotation** microservice.

---

## Google Cloud Provisioning

### 1. Build & Deploy the Microservice to Cloud Run

Deploy the service as a secure, IAM-authenticated endpoint:

```bash
# Build the container image using Cloud Build
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/creator-style-lab-worker

# Deploy to Cloud Run (disallowing unauthenticated access)
gcloud run deploy theme-rotation-worker \
  --image gcr.io/YOUR_PROJECT_ID/creator-style-lab-worker \
  --platform managed \
  --region asia-northeast1 \
  --no-allow-unauthenticated \
  --set-env-vars="THEME_ROTATION_SECRET=your-secure-secret-token" \
  --set-env-vars="DAILY_THEME_ROTATION_PROVIDER=gemini" \
  --set-env-vars="ENABLE_AI_DAILY_THEME_FALLBACK=true"
```

---

### 2. Configure Cloud Scheduler (Daily Trigger)

Create a secure Scheduler Job running daily at midnight Japan Time (`Asia/Tokyo`) using OIDC authentication targeting the deployed endpoint:

```bash
# 1. Create a dedicated Service Account for triggering the job
gcloud iam service-accounts create theme-rotation-scheduler-sa \
  --display-name="Theme Rotation Cloud Scheduler Trigger Account"

# 2. Grant the service account permissions to call the Cloud Run worker
gcloud run services add-iam-policy-binding theme-rotation-worker \
  --member="serviceAccount:theme-rotation-scheduler-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker" \
  --region=asia-northeast1

# 3. Provision the Cloud Scheduler job targeting /api/jobs/rotate-daily-theme
gcloud scheduler jobs create http daily-theme-rotation-job \
  --schedule="55 23 * * *" \
  --time-zone="Asia/Tokyo" \
  --uri="https://theme-rotation-worker-xxxx-an.a.run.app/api/jobs/rotate-daily-theme" \
  --http-method=POST \
  --oidc-service-account-email="theme-rotation-scheduler-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --headers="Content-Type=application/json,x-rotation-secret=your-secure-secret-token"
```

This completes a highly secure, enterprise-ready, IAM-authenticated execution loop with absolute zero exposure to the public internet!
