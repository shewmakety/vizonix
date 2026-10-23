import { cloneElement, type ReactElement, type Ref } from "react";
import { TurnstileField, type TurnstileHandle } from "@/components/TurnstileField";
import { sponsorHumanLabel } from "@/lib/sponsor-form-copy";
import type { TurnstileAction } from "@/lib/turnstile-public";

function FieldFlag({ required }: { required: boolean }) {
  return (
    <span className={required ? "field-flag" : "field-flag optional"}>{required ? "Required" : "Optional"}</span>
  );
}

export function SponsorField({
  id,
  label,
  required,
  help,
  children,
}: {
  id: string;
  label: string;
  required: boolean;
  help: string;
  children: ReactElement<{ id?: string; required?: boolean; "aria-required"?: boolean; "aria-describedby"?: string }>;
}) {
  const helpId = `${id}-help`;
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} <FieldFlag required={required} />
      </label>
      {cloneElement(children, {
        id,
        required: required ? true : undefined,
        "aria-required": required,
        "aria-describedby": helpId,
      })}
      <p id={helpId} className="field-help">
        {help}
      </p>
    </div>
  );
}

export function SponsorCheck({
  id,
  name,
  label,
  help,
  checked,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  help: string;
  checked?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const helpId = `${id}-help`;
  return (
    <div className="field">
      <label className="check" htmlFor={id}>
        <input
          id={id}
          name={name}
          type="checkbox"
          aria-required={false}
          aria-describedby={helpId}
          {...(checked !== undefined ? { checked } : {})}
          {...(onChange ? { onChange } : {})}
        />
        <span>
          {label} <FieldFlag required={false} />
        </span>
      </label>
      <p id={helpId} className="field-help">
        {help}
      </p>
    </div>
  );
}

export function SponsorVerification({
  id,
  action,
  help,
  turnstileRef,
  onToken,
}: {
  id: string;
  action: TurnstileAction;
  help: string;
  turnstileRef: Ref<TurnstileHandle>;
  onToken: (token: string) => void;
}) {
  const helpId = `${id}-help`;
  const labelId = `${id}-label`;
  return (
    <div className="field" role="group" aria-labelledby={labelId} aria-describedby={helpId} aria-required="true">
      <p id={labelId} className="verify-label">
        {sponsorHumanLabel} <FieldFlag required />
      </p>
      <TurnstileField ref={turnstileRef} action={action} onToken={onToken} />
      <p id={helpId} className="field-help">
        {help}
      </p>
    </div>
  );
}
