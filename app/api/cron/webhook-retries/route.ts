import {createAdminClient} from "@/lib/supabase/admin"
import {deliverWebhook} from "@/lib/webhooks/deliver"
export const runtime="nodejs";export const dynamic="force-dynamic"
export async function GET(request:Request){if(request.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return Response.json({error:"Unauthorized"},{status:401});const db=createAdminClient(),{data,error}=await db.from("webhook_deliveries").select("id").in("status",["pending","retrying"]).lte("next_attempt_at",new Date().toISOString()).order("next_attempt_at").limit(50);if(error)return Response.json({error:error.message},{status:500});for(const row of data??[])await deliverWebhook(row.id);return Response.json({processed:data?.length??0})}
