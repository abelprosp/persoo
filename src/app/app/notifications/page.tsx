import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Notificações</h1>
      <Card className="border-border/80 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-5" />
            Centro de alertas
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Ainda não há notificações. Eventos de CRM e lembretes de IA aparecerão aqui.
        </CardContent>
      </Card>
    </div>
  );
}
