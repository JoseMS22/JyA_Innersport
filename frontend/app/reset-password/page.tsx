// frontend/app/reset-password/page.tsx
"use client";

import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { apiFetch } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [token, setToken] = useState("");
  const [passwords, setPasswords] = useState({
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

  // Extraer token de la URL
  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setErrorMsg("Token no válido. Por favor solicita un nuevo enlace de recuperación.");
    }
  }, [searchParams]);

  // Validar política de contraseña
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

  function handlePasswordChange(field: "new" | "confirm", value: string) {
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
      token,
      new_password: passwords.new,
      confirm_new_password: passwords.confirm,
    };

    try {
      const response = await apiFetch("/api/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccessMsg(response.message);
      
      // Limpiar formulario
      setPasswords({ new: "", confirm: "" });
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      let errorMessage = err.message ?? "Error al restablecer contraseña";
      
      // Parsear errores de array
      if (typeof errorMessage === "string" && errorMessage.includes("[")) {
        try {
          const errors = JSON.parse(errorMessage);
          if (Array.isArray(errors)) {
            errorMessage = errors.join("\n");
          }
        } catch {}
      }
      
      setErrorMsg(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const allValid = Object.values(validations).every(v => v) && token !== "";

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/90 rounded-2xl shadow-xl border border-[#a855f7]/10 p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <Logo size={120} />
          <h1 className="mt-4 text-2xl font-bold text-[#6b21a8]">
            Nueva contraseña
          </h1>
          <p className="mt-2 text-sm text-center text-gray-600">
            Ingresa tu nueva contraseña segura
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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
              disabled={loading || !token}
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

          {/* Confirmar contraseña */}
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
              disabled={loading || !token}
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

          {/* Mensajes */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700 whitespace-pre-line">
                {errorMsg}
              </p>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 text-lg">✓</span>
                <div className="flex-1">
                  <p className="text-xs text-emerald-700 font-medium">
                    {successMsg}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">
                    Redirigiendo al inicio de sesión...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={loading || !allValid}
            className="w-full rounded-lg bg-[#a855f7] hover:bg-[#7e22ce] text-white font-medium py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Restableciendo..." : "Restablecer contraseña"}
          </button>

          {/* Enlace */}
          <div className="pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full text-center text-sm text-[#6b21a8] hover:text-[#a855f7] font-medium"
            >
              ← Volver a iniciar sesión
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Componente helper
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center">
      <p className="text-gray-600">Cargando...</p>
    </div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}