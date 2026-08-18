"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, User, Phone, Mail, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";

interface Cliente {
  personaId: number;
  razonSocial: string;
  documento: string;
  telefono: string;
  email: string;
  tieneFacturas: boolean;
}

export function CRMClientesPage({ empresaId }: { empresaId: number }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [clienteEditingId, setClienteEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    empresaId: empresaId,
    razonSocial: "",
    documento: "",
    telefono: "",
    email: ""
  });

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/contactos/clientes/${empresaId}`);
      if (res.ok) {
        const data = await res.json();
        setClientes(data);
      }
    } catch (error) {
      toast.error("Error", { description: "Problema al cargar clientes." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, [empresaId]);

  const handleSave = async () => {
    try {
      const url = isEditMode
        ? `${API_BASE}/api/contactos/clientes/${clienteEditingId}`
        : `${API_BASE}/api/contactos/clientes`;
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, empresaId })
      });
      if (res.ok) {
        toast.success("Éxito", { description: isEditMode ? "Cliente actualizado." : "Cliente registrado." });
        setIsModalOpen(false);
        setFormData({ empresaId, razonSocial: "", documento: "", telefono: "", email: "" });
        setIsEditMode(false);
        setClienteEditingId(null);
        cargarClientes();
      }
    } catch (error) {
      toast.error("Error", { description: "Problema al guardar." });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar este cliente?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/contactos/clientes/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Eliminado", { description: "Cliente eliminado correctamente." });
        cargarClientes();
      } else {
        toast.error("Error al eliminar");
      }
    } catch (e) { toast.error("Error de conexión"); }
  };

  const openEditModal = (cliente: Cliente) => {
    setFormData({
      empresaId: empresaId,
      razonSocial: cliente.razonSocial,
      documento: cliente.documento,
      telefono: cliente.telefono || "",
      email: cliente.email || ""
    });
    setClienteEditingId(cliente.personaId);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setFormData({ empresaId, razonSocial: "", documento: "", telefono: "", email: "" });
    setIsEditMode(false);
    setClienteEditingId(null);
    setIsModalOpen(true);
  };

  const filtrados = clientes.filter(c =>
    c.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.documento?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black italic text-foreground tracking-tight">CRM Clientes</h2>
          <p className="text-sm text-muted-foreground font-medium">Gestión de cartera de clientes y facturación.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md font-bold" onClick={openNewModal}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-black italic text-xl text-primary">{isEditMode ? "Editar Cliente" : "Registrar Cliente"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Razón Social / Nombre *</label>
                <Input
                  value={formData.razonSocial}
                  onChange={e => setFormData({ ...formData, razonSocial: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Documento (RUC / CI) *</label>
                <Input
                  value={formData.documento}
                  onChange={e => setFormData({ ...formData, documento: e.target.value })}
                  placeholder="Ej. 1234567-8"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Teléfono</label>
                <Input
                  value={formData.telefono}
                  onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="Ej. 0981..."
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Email</label>
                <Input
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Ej. correo@empresa.com"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="bg-primary text-white">Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-card">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o RUC..."
              className="pl-9 bg-muted border-none rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total: {clientes.length}</span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Cliente / Razón Social</TableHead>
                <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">RUC / CI</TableHead>
                <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Contacto</TableHead>
                <TableHead className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">Cargando...</TableCell></TableRow>
              ) : filtrados.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No hay clientes registrados.</TableCell></TableRow>
              ) : (
                filtrados.map((c) => (
                  <TableRow key={c.personaId} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {c.razonSocial.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-foreground">{c.razonSocial}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">{c.documento}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        {c.telefono && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.telefono}</span>}
                        {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary" onClick={() => openEditModal(c)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 ml-1" onClick={() => handleDelete(c.personaId)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

export default CRMClientesPage;
