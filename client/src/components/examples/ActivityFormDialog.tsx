import { ActivityFormDialog } from "../ActivityFormDialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function ActivityFormDialogExample() {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="p-4">
      <Button onClick={() => setOpen(true)}>Abrir formulário</Button>
      <ActivityFormDialog
        open={open}
        onOpenChange={setOpen}
        onSave={(activity) => {
          console.log("Atividade salva:", activity);
        }}
      />
    </div>
  );
}
