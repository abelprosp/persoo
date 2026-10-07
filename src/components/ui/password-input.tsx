"use client";
import { useState, type ComponentProps } from "react";
import { Input } from "./input";
export function PasswordInput(props: ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return <div className="relative"><Input {...props} type={visible ? "text" : "password"} className="pr-20" /><button type="button" className="absolute inset-y-0 right-2 px-2 text-xs font-medium" aria-pressed={visible} aria-label={visible ? "Ocultar senha" : "Mostrar senha"} onClick={() => setVisible(!visible)}>{visible ? "Ocultar" : "Mostrar"}</button></div>;
}
