// frontend/app/register/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "../../components/Logo";
import { PasswordInput } from "@/components/PasswordInput";
import { apiFetch } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Estados para contraseñas
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Validaciones en tiempo real
  const [validations, setValidations] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecial: false,
    noSpaces: false,
    passwordsMatch: false,
  });

  const [showValidations, setShowValidations] = useState(false);

  // Validar contraseña
  function validatePassword(pwd: string) {
    setValidations({
      minLength: pwd.length >= 8,
      hasUpperCase: /[A-Z]/.test(pwd),
      hasLowerCase: /[a-z]/.test(pwd),
      hasNumber: /\d/.test(pwd),
      hasSpecial: /[^\w\s]/.test(pwd),
      noSpaces: !/\s/.test(pwd),
      passwordsMatch: pwd === confirmPassword && confirmPassword !== "",
    });
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    setShowValidations(value.length > 0);
    validatePassword(value);
  }

  function handleConfirmPasswordChange(value: string) {
    setConfirmPassword(value);
    setValidations(prev => ({
      ...prev,
      passwordsMatch: password === value && value !== "",
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      nombre: formData.get("nombre") as string,
      correo: formData.get("correo") as string,
      telefono: formData.get("telefono") as string,
      password: password,
      confirm_password: confirmPassword,
      provincia: formData.get("provincia") as string,
      canton: formData.get("canton") as string,
      distrito: formData.get("distrito") as string,
      detalle: formData.get("detalle") as string,
      telefono_direccion: formData.get("telefono_direccion") as string,
    };

    try {
      await apiFetch("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccessMsg(
        "¡Cuenta creada exitosamente! Revisa tu correo y haz clic en el enlace de verificación para activar tu cuenta."
      );
      
      // Limpiar formulario
      form.reset();
      setPassword("");
      setConfirmPassword("");
      setShowValidations(false);

      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      let errorMessage = err.message ?? "Error al registrarse";
      
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

  const allValid = Object.values(validations).every(v => v);

  return (
    <div className="min-h-screen bg-[#fdf6e3] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl bg-white/90 rounded-2xl shadow-xl border border-[#a855f7]/10 p-8 grid md:grid-cols-2 gap-8">
        {/* Columna izquierda: Logo y descripción */}
        <div className="flex flex-col items-center justify-center">
          <Logo size={160} />
          <p className="mt-4 text-sm text-center text-[#6b21a8]">
            Crea tu cuenta para empezar a gestionar tus compras en{" "}
            <span className="font-semibold text-[#a855f7]">
              JYA Innersport
            </span>
            .
          </p>
        </div>

        {/* Columna derecha: Formulario */}
        <div>
          <h1 className="text-xl font-semibold text-[#6b21a8] mb-4">
            Crear cuenta
          </h1>

          <form className="space-y-3 text-sm" onSubmit={handleSubmit}>
            {/* Nombre */}
            <input
              name="nombre"
              placeholder="Nombre completo"
              className="w-full rounded-lg border px-3 py-2 outline-none 
                         border-[#e5e7eb] focus:border-[#a855f7]
                         text-gray-800 placeholder-gray-400"
              required
              disabled={loading}
            />

            {/* Correo */}
            <input
              type="email"
              name="correo"
              placeholder="Correo electrónico"
              className="w-full rounded-lg border px-3 py-2 outline-none 
                         border-[#e5e7eb] focus:border-[#a855f7]
                         text-gray-800 placeholder-gray-400"
              required
              disabled={loading}
              autoComplete="email"
            />

            {/* Teléfono */}
            <input
              name="telefono"
              placeholder="Teléfono (opcional)"
              className="w-full rounded-lg border px-3 py-2 outline-none 
                         border-[#e5e7eb] focus:border-[#a855f7]
                         text-gray-800 placeholder-gray-400"
              disabled={loading}
              autoComplete="tel"
            />

            {/* Contraseñas con ojos */}
            <div className="space-y-3">
              <div>
                <PasswordInput
                  label=""
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Contraseña"
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />

                {/* Validaciones en tiempo real */}
                {showValidations && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs space-y-1">
                    <div className="grid grid-cols-2 gap-1">
                      <ValidationItem valid={validations.minLength} text="8+ caracteres" />
                      <ValidationItem valid={validations.hasUpperCase} text="1 mayúscula" />
                      <ValidationItem valid={validations.hasLowerCase} text="1 minúscula" />
                      <ValidationItem valid={validations.hasNumber} text="1 número" />
                      <ValidationItem valid={validations.hasSpecial} text="1 especial" />
                      <ValidationItem valid={validations.noSpaces} text="Sin espacios" />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <PasswordInput
                  label=""
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  placeholder="Confirmar contraseña"
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />

                {confirmPassword && (
                  <div className="mt-2">
                    <ValidationItem
                      valid={validations.passwordsMatch}
                      text="Las contraseñas coinciden"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Provincia y Cantón */}
            <div className="grid grid-cols-2 gap-3">
              <input
                name="provincia"
                placeholder="Provincia"
                className="w-full rounded-lg border px-3 py-2 outline-none 
                           border-[#e5e7eb] focus:border-[#a855f7]
                           text-gray-800 placeholder-gray-400"
                required
                disabled={loading}
              />

              <input
                name="canton"
                placeholder="Cantón"
                className="w-full rounded-lg border px-3 py-2 outline-none 
                           border-[#e5e7eb] focus:border-[#a855f7]
                           text-gray-800 placeholder-gray-400"
                required
                disabled={loading}
              />
            </div>

            {/* Distrito y Teléfono dirección */}
            <div className="grid grid-cols-2 gap-3">
              <input
                name="distrito"
                placeholder="Distrito"
                className="w-full rounded-lg border px-3 py-2 outline-none 
                           border-[#e5e7eb] focus:border-[#a855f7]
                           text-gray-800 placeholder-gray-400"
                required
                disabled={loading}
              />

              <input
                name="telefono_direccion"
                placeholder="Tel. entrega (opcional)"
                className="w-full rounded-lg border px-3 py-2 outline-none 
                           border-[#e5e7eb] focus:border-[#a855f7]
                           text-gray-800 placeholder-gray-400"
                disabled={loading}
              />
            </div>

            {/* Dirección detallada */}
            <textarea
              name="detalle"
              placeholder="Detalles de dirección (señas exactas)"
              rows={2}
              className="w-full rounded-lg border px-3 py-2 outline-none 
                         border-[#e5e7eb] focus:border-[#a855f7]
                         text-gray-800 placeholder-gray-400 resize-none"
              required
              disabled={loading}
            />

            {/* Mensajes de error */}
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700 whitespace-pre-line">
                  {errorMsg}
                </p>
              </div>
            )}

            {/* Mensaje de éxito */}
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

            {/* Botón de registro */}
            <button
              type="submit"
              disabled={loading || !allValid}
              className="mt-2 w-full rounded-lg bg-[#a855f7] hover:bg-[#7e22ce] text-white font-medium py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Registrando..." : "Crear cuenta"}
            </button>

            {/* Link a login */}
            <p className="mt-2 text-xs text-center text-[#6b21a8]">
              ¿Ya tienes cuenta?{" "}
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="font-semibold text-[#eab308] hover:underline"
              >
                Iniciar sesión
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

// Componente helper para validaciones
function ValidationItem({ valid, text }: { valid: boolean; text: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-xs ${valid ? "text-emerald-600" : "text-gray-400"}`}>
        {valid ? "✓" : "○"}
      </span>
      <span className={`text-xs ${valid ? "text-emerald-700 font-medium" : "text-gray-500"}`}>
        {text}
      </span>
    </div>
  );
}