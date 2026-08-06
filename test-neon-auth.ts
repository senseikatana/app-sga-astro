import { createAuthClient } from "better-auth/react";
const authClient = createAuthClient({ baseURL: "https://ep-patient-brook-as812tt3.apirest.c-4.eu-central-1.aws.neon.tech/neondb/rest/v1" });
authClient.getSession().then(res => console.log("Session:", res)).catch(e => console.error(e));
