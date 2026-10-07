"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog,DialogContent,DialogHeader,DialogTitle } from "@/components/ui/dialog";
import { AiPreview } from "./ai-preview";
export function AiModuleCustomizeButton({module,title}:{module:string;title:string}) {
 const [open,setOpen]=useState(false);
 return <><Button variant="outline" size="sm" onClick={()=>setOpen(true)} aria-label={`Personalizar ${title} com IA`}><Sparkles className="mr-1 size-4 text-violet-600"/>Personalizar</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Personalizar {title}</DialogTitle></DialogHeader><AiPreview module={module}/></DialogContent></Dialog></>;
}
