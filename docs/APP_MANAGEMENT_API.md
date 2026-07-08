# App Versioning API Documentation

This API enables programmatic configuration of mobile application parameters—specifically, version enforcement (force update thresholds) for Android and iOS.

## Base URL
- **Production**: `https://task.amtariksha.com`
- **Local Dev**: `http://localhost:3000`

---

## Authentication
Requests are secured using an API Key. You must supply this key using **one** of the following methods:

1. **Custom Header**:
   - Header Key: `x-api-key`
   - Header Value: `<YOUR_APP_MANAGEMENT_API_KEY>`

2. **Bearer Authorization Header**:
   - Header Key: `Authorization`
   - Header Value: `Bearer <YOUR_APP_MANAGEMENT_API_KEY>`

> [!IMPORTANT]
> The API key is configured on the backend using the environment variable `APP_MANAGEMENT_API_KEY`.
> For local development, check `apps/web/.env.local`.

---

## Endpoints

### 1. Retrieve Current Configuration
Gets the currently active version thresholds.

- **URL**: `/api/settings/app-management`
- **Method**: `GET`
- **Auth Required**: None (Public Endpoint)

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "data": {
    "minAndroidVersion": "1.2.0",
    "minIosVersion": "1.2.0",
    "updatedAt": "2026-07-06T17:04:14.302Z"
  }
}
```

---

### 2. Update Configuration
Allows changing version parameters. Any omitted parameters will preserve their current database values.

- **URL**: `/api/settings/app-management`
- **Method**: `POST` or `PATCH`
- **Auth Required**: Yes (API Key or Admin Session Cookie)
- **Headers**:
  - `Content-Type: application/json`
  - `x-api-key: karmayog_app_management_key_2026`

#### Request Payload Examples

##### A. Update Android Version Only
```json
{
  "minAndroidVersion": "1.3.0"
}
```

##### B. Update Both Android and iOS Force Update Thresholds
```json
{
  "minAndroidVersion": "1.3.1",
  "minIosVersion": "1.3.1"
}
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "data": {
    "minAndroidVersion": "1.3.1",
    "minIosVersion": "1.3.1",
    "updatedAt": "2026-07-06T17:05:48.102Z"
  },
  "firestoreSynced": true,
  "message": "App version configuration updated and synchronized successfully"
}
```

---

## Postman Setup Guide

To verify or test in Postman:
1. Create a new request in Postman.
2. Set the method to `PATCH` (or `POST`) and URL to `http://localhost:3000/api/settings/app-management`.
3. Go to the **Headers** tab and add:
   - **Key**: `x-api-key`
   - **Value**: `karmayog_app_management_key_2026`
4. Go to the **Body** tab, select **raw** and set the format to **JSON**.
5. Input the payload you want to update (e.g. `{"minAndroidVersion": "1.3.0"}`).
6. Send the request.

---

## cURL Example
```bash
curl -X PATCH http://localhost:3000/api/settings/app-management \
  -H "Content-Type: application/json" \
  -H "x-api-key: karmayog_app_management_key_2026" \
  -d '{"minAndroidVersion": "1.3.0", "minIosVersion": "1.3.0"}'
```
