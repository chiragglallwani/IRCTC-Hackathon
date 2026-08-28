import quotasJson from "@/irctc-hackathon-mock/data/large/quotas.json";
import type { Quota } from "./types";

export const quotas = quotasJson.records as Quota[];
