import { generateCustomization } from "@/lib/ai-customization";
export async function POST(request:Request) { return generateCustomization(request,true); }
