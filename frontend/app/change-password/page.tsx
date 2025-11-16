// frontend/app/change-password/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { MainMenu } from "@/components/MainMenu";
import { apiFetch } from "@/lib/api";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Estados para validación en tiempo real
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [validations, setValidations] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecial: false,
    noSpaces: false,
    passwordsMatch: false,
  });

  // Validar política de contraseña en tiempo real
  function validatePassword(password: string) {
    setValidations({
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[^\w\s]/.test(password),
      noSpaces: !/\s/.test(password),
      passwordsMatch: password === passwords.confirm && passwords.confirm !== "",
    });
  }

  // Manejar cambios en inputs
  function handlePasswordChange(field: "current" | "new" | "confirm", value: string) {
    const newPasswords = { ...passwords, [field]: value };
    setPasswords(newPasswords);

    if (field === "new") {
      validatePassword(value);
    }

    if (field === "confirm") {
      setValidations(prev => ({
        ...prev,
        passwordsMatch: newPasswords.new === value && value !== "",
      }));
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const payload = {
      current_password: passwords.current,
      new_password: passwords.new,
      confirm_new_password: passwords.confirm,
    };

    try {
      await apiFetch("/api/v1/auth/change-password", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setSuccessMsg("Contraseña actualizada correctamente. Redirigiendo...");
      
      // Limpiar formulario
      setPasswords({ current: "", new: "", confirm: "" });
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: any) {
      // Manejar errores del backend
      let errorMessage = err.message ?? "Error al cambiar contraseña";
      
      // Si el error es un array (validaciones múltiples)
      if (typeof errorMessage === "string" && errorMessage.includes("[")) {
        try {
          const errors = JSON.parse(errorMessage);
          if (Array.isArray(errors)) {
            errorMessage = errors.join("\n");
          }
        } catch {
          // Si no se puede parsear, usar el mensaje original
        }
      }
      
      setErrorMsg(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  // Verificar si todos los requisitos se cumplen
  const allValid = Object.values(validations).every(v => v) && passwords.current !== "";

  return (
    <div className="min-h-screen bg-[#fdf6e3]">
      <MainMenu />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="text-xs text-gray-500 mb-6">
          <button onClick={() => router.push("/")} className="hover:text-[#6b21a8]">
            Inicio
          </button>
          <span className="mx-2">›</span>
          <span className="text-gray-800 font-medium">Cambiar contraseña</span>
        </div>

        {/* Card principal */}
        <div className="bg-white/90 rounded-2xl shadow-xl border border-[#a855f7]/10 p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#6b21a8] mb-2">
              Cambiar contraseña
            </h1>
            <p className="text-sm text-gray-600">
              Actualiza tu contraseña para mantener tu cuenta segura.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Contraseña actual */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña actual
              </label>
              <input
                type="password"
                value={passwords.current}
                onChange={(e) => handlePasswordChange("current", e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 outline-none border-[#e5e7eb] focus:border-[#a855f7] transition-colors"
                placeholder="Ingresa tu contraseña actual"
                required
              />
            </div>

            {/* Nueva contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nueva contraseña
              </label>
              <input
                type="password"
                value={passwords.new}
                onChange={(e) => handlePasswordChange("new", e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 outline-none border-[#e5e7eb] focus:border-[#a855f7] transition-colors"
                placeholder="Ingresa tu nueva contraseña"
                required
              />

              {/* Requisitos de contraseña */}
              {passwords.new && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs space-y-1.5">
                  <p className="font-semibold text-gray-700 mb-2">
                    Tu contraseña debe cumplir:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <ValidationItem
                      valid={validations.minLength}
                      text="Mínimo 8 caracteres"
                    />
                    <ValidationItem
                      valid={validations.hasUpperCase}
                      text="Una mayúscula"
                    />
                    <ValidationItem
                      valid={validations.hasLowerCase}
                      text="Una minúscula"
                    />
                    <ValidationItem
                      valid={validations.hasNumber}
                      text="Un número"
                    />
                    <ValidationItem
                      valid={validations.hasSpecial}
                      text="Un carácter especial"
                    />
                    <ValidationItem
                      valid={validations.noSpaces}
                      text="Sin espacios"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirmar nueva contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar nueva contraseña
              </label>
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) => handlePasswordChange("confirm", e.target.value)}
                className="w-full rounded-lg border px-4 py-2.5 outline-none border-[#e5e7eb] focus:border-[#a855f7] transition-colors"
                placeholder="Confirma tu nueva contraseña"
                required
              />

              {/* Indicador de coincidencia */}
              {passwords.confirm && (
                <div className="mt-2">
                  <ValidationItem
                    valid={validations.passwordsMatch}
                    text="Las contraseñas coinciden"
                  />
                </div>
              )}
            </div>

            {/* Mensajes de error/éxito */}
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700 whitespace-pre-line">
                  {errorMsg}
                </p>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-xs text-emerald-700 font-medium">
                  {successMsg}
                </p>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="flex-1 rounded-lg border border-gray-300 text-gray-700 font-medium py-2.5 text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !allValid}
                className="flex-1 rounded-lg bg-[#a855f7] hover:bg-[#7e22ce] text-white font-medium py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Actualizando..." : "Cambiar contraseña"}
              </button>
            </div>
          </form>
        </div>

        {/* Tips de seguridad */}
        <div className="mt-6 p-4 bg-white/70 rounded-xl border border-[#e5e7eb]">
          <h3 className="text-sm font-semibold text-[#6b21a8] mb-2">
            💡 Consejos de seguridad
          </h3>
          <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
            <li>No reutilices contraseñas de otras cuentas</li>
            <li>Usa combinaciones únicas de letras, números y símbolos</li>
            <li>Cambia tu contraseña periódicamente</li>
            <li>No compartas tu contraseña con nadie</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

// Componente helper para mostrar requisitos
function ValidationItem({ valid, text }: { valid: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs ${valid ? "text-emerald-600" : "text-gray-400"}`}>
        {valid ? "✓" : "○"}
      </span>
      <span className={`text-xs ${valid ? "text-emerald-700 font-medium" : "text-gray-500"}`}>
        {text}
      </span>
    </div>
  );
}