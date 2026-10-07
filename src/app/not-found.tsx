import Link from "next/link";
export default function NotFound(){return <main className="mx-auto max-w-lg p-10"><h1 className="text-2xl font-semibold">Página não encontrada</h1><p className="my-4">O endereço pode ter mudado ou o registro não está disponível para sua conta.</p><Link className="underline" href="/app">Voltar ao início</Link></main>;}
