"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { updateForgotPassword } from "@/lib/api/auth";
import { getPasswordValidationError } from "@/lib/auth/password";
import styles from "../forgot-password.module.css";

export default function SetNewPasswordPage() {
  const router = useRouter();
  const params = useParams<{ forgotLink: string }>();
  const forgotLink = params?.forgotLink ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const passwordError = useMemo(() => {
    if (!submitted) return "";
    return getPasswordValidationError(password) ?? "";
  }, [password, submitted]);

  const confirmError = useMemo(() => {
    if (!submitted) return "";
    if (!confirmPassword) return "Please confirm new password";
    if (confirmPassword !== password) return "Passwords do not match";
    return "";
  }, [password, confirmPassword, submitted]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setServerError("");

    if (!forgotLink || passwordError || confirmError) return;

    try {
      setIsSubmitting(true);
      const response = await updateForgotPassword({ forgotLink, password });
      if (response.code === 200) {
        router.replace("/auth/login?reset=success");
        return;
      }

      const message =
        response.message || "Unable to update password. Please try again.";
      if (/expired/i.test(message)) {
        setServerError("This link has expired. Request a new reset link.");
        return;
      }
      setServerError(message);
    } catch {
      setServerError("Unable to update password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <p className={styles.title}>Set your new password</p>

        <div className={styles.card}>
          {serverError ? (
            <p className={styles.bannerError}>{serverError}</p>
          ) : null}

          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.fieldGroup}>
              <label htmlFor="new-password" className={styles.label}>
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                className={styles.input}
                placeholder="NewPassword123!"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {passwordError ? (
                <p className={styles.fieldError}>{passwordError}</p>
              ) : null}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="confirm-password" className={styles.label}>
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                className={styles.input}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              {confirmError ? (
                <p className={styles.fieldError}>{confirmError}</p>
              ) : null}
            </div>

            <button
              type="submit"
              className={styles.submit}
              disabled={isSubmitting}
              data-text="Update Password"
            >
              <span>{isSubmitting ? "Updating..." : "Update Password"}</span>
            </button>
          </form>

          {serverError.toLowerCase().includes("expired") ? (
            <p className={styles.helper}>
              Need a new reset link?{" "}
              <Link
                href="/account/forgot-password"
                className={styles.helperLink}
              >
                Request new link
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
