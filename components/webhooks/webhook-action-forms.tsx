"use client"

import { useActionState, useEffect } from "react"
import { LoaderCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createWebhookEndpoint, retryWebhook, sendTestWebhook, toggleWebhookEndpoint, type WebhookActionState } from "@/app/actions/webhooks"

const initialState: WebhookActionState = { success:false,message:"" }
function Feedback({state}:{state:WebhookActionState}) { useEffect(()=>{if(!state.message)return;(state.success?toast.success:toast.error)(state.message)},[state]); return state.message?<p role="status" className={`text-xs ${state.success?"text-emerald-600":"text-destructive"}`}>{state.message}</p>:null }

export function CreateEndpointForm(){const[state,action,pending]=useActionState(createWebhookEndpoint,initialState);return <form action={action} className="space-y-2"><div className="flex flex-col gap-3 sm:flex-row"><Input name="name" placeholder="Zapier production" required disabled={pending}/><Input name="url" type="url" placeholder="https://hooks.zapier.com/hooks/catch/..." required disabled={pending}/><Button disabled={pending}>{pending?<><LoaderCircle className="animate-spin"/>Creating...</>:"Create endpoint"}</Button></div><Feedback state={state}/></form>}
export function TestEndpointForm({id}:{id:string}){const[state,action,pending]=useActionState(sendTestWebhook,initialState);return <form action={action} className="space-y-1"><input type="hidden" name="endpoint_id" value={id}/><Button size="sm" variant="outline" disabled={pending}>{pending?<><LoaderCircle className="animate-spin"/>Sending...</>:"Send test"}</Button><Feedback state={state}/></form>}
export function ToggleEndpointForm({id,active}:{id:string;active:boolean}){const[state,action,pending]=useActionState(toggleWebhookEndpoint,initialState);return <form action={action} className="space-y-1"><input type="hidden" name="id" value={id}/><input type="hidden" name="active" value={String(!active)}/><Button size="sm" disabled={pending}>{pending?<><LoaderCircle className="animate-spin"/>Saving...</>:(active?"Disable":"Enable")}</Button><Feedback state={state}/></form>}
export function RetryDeliveryForm({id}:{id:string}){const[state,action,pending]=useActionState(retryWebhook,initialState);return <form action={action} className="space-y-1"><input type="hidden" name="delivery_id" value={id}/><Button size="sm" variant="outline" disabled={pending}>{pending?<><LoaderCircle className="animate-spin"/>Retrying...</>:"Retry"}</Button><Feedback state={state}/></form>}
