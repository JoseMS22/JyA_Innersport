// frontend/app/admin/usuarios/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useToast } from "@/app/context/ToastContext";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  telefono?: string;
  rol: string;
  activo: boolean;
  created_at: string;
}

export default function AdminUsuariosPage() {
  const { showToast } = useToast();
  
  // Estados de datos
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Estados de filtros
  const [page, setPage] = useState(1);
  const limit = 10;
  const [search, setSearch] = useState("");
  const [rolFilter, setRolFilter] = useState("");

  // Estados de Modales
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [userToDelete, setUserToDelete] = useState<Usuario | null>(null);

  // Formulario
  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    password: "",
    confirm_password: "",
    rol: "CLIENTE",
    activo: true,
  });

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const skip = (page - 1) * limit;
      let url = `${API_BASE}/api/v1/usuarios/?skip=${skip}&limit=${limit}`;
      
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (rolFilter) url += `&rol=${rolFilter}`;

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar usuarios");
      
      const data = await res.json();
      setUsuarios(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error(error);
      showToast("Error al cargar usuarios", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, [page, search, rolFilter]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      nombre: "",
      correo: "",
      telefono: "",
      password: "",
      confirm_password: "",
      rol: "CLIENTE",
      activo: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (user: Usuario) => {
    setEditingUser(user);
    setFormData({
      nombre: user.nombre,
      correo: user.correo,
      telefono: user.telefono || "",
      password: "", 
      confirm_password: "",
      rol: user.rol,
      activo: user.activo,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!editingUser) {
        // Creación: Contraseña obligatoria
        if (!formData.password || formData.password !== formData.confirm_password) {
            return showToast("Las contraseñas no coinciden o están vacías", "error");
        }
    } else {
        // Edición: Contraseña opcional, pero si se pone, debe coincidir
        if (formData.password && formData.password !== formData.confirm_password) {
            return showToast("Las contraseñas no coinciden", "error");
        }
    }

    try {
      const url = editingUser 
        ? `${API_BASE}/api/v1/usuarios/${editingUser.id}`
        : `${API_BASE}/api/v1/usuarios/`;
      
      const method = editingUser ? "PUT" : "POST";
      
      const payload: any = { ...formData };

      // LÓGICA CORREGIDA AQUÍ:
      if (editingUser) {
         // Si estamos editando (PUT):
         // 1. Si no escribió password, lo quitamos para no enviar string vacío.
         if (!payload.password) delete payload.password;
         // 2. El esquema de actualización (UserUpdateAdmin) NO tiene confirm_password, lo borramos.
         delete payload.confirm_password;
      } else {
         // Si estamos creando (POST):
         // El esquema de creación (UserCreateAdmin) REQUIERE confirm_password.
         // NO debemos borrarlo.
      }
      
      if (!payload.telefono) payload.telefono = null;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Error al guardar usuario");
      }

      showToast(`Usuario ${editingUser ? "actualizado" : "creado"} correctamente`, "success");
      setShowModal(false);
      fetchUsuarios();
    } catch (error: any) {
      showToast(error.message, "error");
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
        const res = await fetch(`${API_BASE}/api/v1/usuarios/${userToDelete.id}`, {
            method: "DELETE",
            credentials: "include"
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || "Error al eliminar");
        }

        showToast("Usuario eliminado correctamente", "success");
        setUserToDelete(null);
        fetchUsuarios();
    } catch (error: any) {
        showToast(error.message, "error");
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#6b21a8]">Gestión de Usuarios</h1>
          <p className="text-sm text-gray-500">Administra clientes, vendedores y administradores.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-indigo-600 !text-white rounded-lg hover:bg-indigo-700 font-medium text-sm flex items-center gap-2 shadow-sm transition-colors"
        >
          + Nuevo Usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
            <input
                type="text"
                placeholder="Buscar por nombre o correo..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
        </div>
        <div className="w-full sm:w-48">
            <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={rolFilter}
                onChange={(e) => { setRolFilter(e.target.value); setPage(1); }}
            >
                <option value="">Todos los roles</option>
                <option value="CLIENTE">Clientes</option>
                <option value="VENDEDOR">Vendedores</option>
                <option value="ADMIN">Administradores</option>
            </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Registro</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {loading ? (
                    <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Cargando...</td>
                    </tr>
                ) : usuarios.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No se encontraron usuarios.</td>
                    </tr>
                ) : (
                    usuarios.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{user.nombre}</div>
                            <div className="text-gray-500 text-xs">{user.correo}</div>
                            {user.telefono && <div className="text-gray-400 text-xs">Tel: {user.telefono}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${user.rol === 'ADMIN' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 
                                  user.rol === 'VENDEDOR' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 
                                  'bg-green-100 text-green-800 border border-green-200'}`}>
                                {user.rol}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${user.activo ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {user.activo ? 'Activo' : 'Inactivo'}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                            <div className="flex justify-end gap-2">
                                <button 
                                    onClick={() => handleOpenEdit(user)} 
                                    className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 transition-colors"
                                    title="Editar usuario"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                </button>
                                <button 
                                    onClick={() => setUserToDelete(user)} 
                                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-800 transition-colors"
                                    title="Eliminar usuario"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                    ))
                )}
            </tbody>
            </table>
        </div>
        
        {/* Paginación */}
        {total > limit && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between">
                    <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                        Anterior
                    </button>
                    <span className="text-sm text-gray-700 self-center">
                        Página {page} de {totalPages}
                    </span>
                    <button 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                        Siguiente
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* MODAL CREAR / EDITAR */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-900">
                        {editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}
                    </h2>
                    <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                        <input type="text" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico *</label>
                        <input type="email" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                        <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                value={formData.rol} onChange={e => setFormData({...formData, rol: e.target.value})}>
                                <option value="CLIENTE">Cliente</option>
                                <option value="VENDEDOR">Vendedor</option>
                                <option value="ADMIN">Administrador</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                            <div className="flex items-center h-[38px]">
                                <input type="checkbox" id="activo" className="mr-2 h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                    checked={formData.activo} onChange={e => setFormData({...formData, activo: e.target.checked})} />
                                <label htmlFor="activo" className="text-sm text-gray-700 cursor-pointer">Cuenta Activa</label>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4 mt-2">
                        <p className="text-xs text-gray-500 mb-3 font-semibold uppercase">
                            {editingUser ? "Cambiar Contraseña (Opcional)" : "Contraseña *"}
                        </p>
                        <div className="space-y-3">
                            <div>
                                <input type="password" placeholder="Nueva contraseña" 
                                    required={!editingUser}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                            </div>
                            <div>
                                <input type="password" placeholder="Confirmar contraseña" 
                                    required={!editingUser}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    value={formData.confirm_password} onChange={e => setFormData({...formData, confirm_password: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm transition-colors">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 !text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={!!userToDelete}
        title="Eliminar Usuario"
        message={`¿Estás seguro de que deseas eliminar al usuario "${userToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Sí, eliminar"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
}