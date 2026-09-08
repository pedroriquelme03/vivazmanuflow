import * as Sentry from "@sentry/nextjs";
import { opcoesSentry } from "@/lib/sentry";

Sentry.init(opcoesSentry());
