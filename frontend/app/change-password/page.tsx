// frontend/app/change-password/page.tsx

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { MainMenu } from "@/components/MainMenu";
import { RecommendedFooter } from "@/components/RecommendedFooter";
import { PasswordInput } from "@/components/PasswordInput";
import { useNotifications } from "../context/NotificationContext";
import { apiFetch } from "@/lib/api";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { success, error } = useNotifications();
  const [loading, setLoading] = useState(false);

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

      success("Contraseña actualizada", "Tu contraseña se ha cambiado correctamente");

      // Limpiar formulario
      setPasswords({ current: "", new: "", confirm: "" });

      // Redirigir después de 2 segundos
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: any) {
      let errorMessage = err.message ?? "Error al cambiar contraseña";

      if (typeof errorMessage === "string" && errorMessage.includes("[")) {
        try {
          const errors = JSON.parse(errorMessage);
          if (Array.isArray(errors)) {
            errorMessage = errors.join("\n");
          }
        } catch { }
      }

      error("Error al cambiar contraseña", errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const allValid = Object.values(validations).every(v => v) && passwords.current !== "";

  return (
    <div className="min-h-screen bg-[#fdf6e3]">
      <MainMenu />

      <main className="max-w-2xl mx-auto px-4 py-8 pt-[140px]">
        {/* Breadcrumb mejorado */}
        <div className="flex items-center py-3 gap-2 mb-6 text-sm">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-[#a855f7] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Inicio
          </button>
          <span className="text-gray-400">›</span>
          <button
            onClick={() => router.push("/account/profile")}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-[#a855f7] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Mi cuenta
          </button>
          <span className="text-gray-400">›</span>
          <span className="px-3 py-1.5 rounded-lg bg-[#a855f7] text-white font-medium">
            Mis direcciones
          </span>
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
            {/* Contraseña actual con ojo */}
            <PasswordInput
              label="Contraseña actual"
              value={passwords.current}
              onChange={(value) => handlePasswordChange("current", value)}
              placeholder="Ingresa tu contraseña actual"
              required
              disabled={loading}
              autoComplete="current-password"
            />

            {/* Nueva contraseña con ojo */}
            <div>
              <PasswordInput
                label="Nueva contraseña"
                value={passwords.new}
                onChange={(value) => handlePasswordChange("new", value)}
                placeholder="Ingresa tu nueva contraseña"
                required
                disabled={loading}
                autoComplete="new-password"
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

            {/* Confirmar nueva contraseña con ojo */}
            <div>
              <PasswordInput
                label="Confirmar nueva contraseña"
                value={passwords.confirm}
                onChange={(value) => handlePasswordChange("confirm", value)}
                placeholder="Confirma tu nueva contraseña"
                required
                disabled={loading}
                autoComplete="new-password"
              />

              {passwords.confirm && (
                <div className="mt-2">
                  <ValidationItem
                    valid={validations.passwordsMatch}
                    text="Las contraseñas coinciden"
                  />
                </div>
              )}
            </div>

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

      {/* Footer con productos recomendados */}
      <RecommendedFooter />
    </div>
  );
}

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