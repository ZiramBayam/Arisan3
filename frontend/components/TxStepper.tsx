import { CheckIcon } from "./icons";

export type StepState = "idle" | "active" | "done" | "error";

export type Step = {
  title: string;
  description: string;
  state: StepState;
  errorMessage?: string;
};

export function TxStepper({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, idx) => (
        <li
          key={step.title}
          className={`flex gap-3 rounded-xl border p-4 transition ${
            step.state === "active"
              ? "border-accent bg-accent-50"
              : step.state === "done"
                ? "border-ink/5 bg-prime-100"
                : step.state === "error"
                  ? "border-danger bg-prime-100"
                  : "border-ink/5 bg-prime-100/60"
          }`}
        >
          <div
            className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-sm font-bold ${
              step.state === "done"
                ? "bg-accent text-white"
                : step.state === "active"
                  ? "bg-ink text-prime"
                  : step.state === "error"
                    ? "bg-danger text-white"
                    : "bg-prime-300 text-ink-subtle"
            }`}
          >
            {step.state === "done" ? (
              <CheckIcon size={14} />
            ) : step.state === "error" ? (
              "!"
            ) : (
              idx + 1
            )}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-ink">{step.title}</div>
            <div className="text-xs text-ink-muted">{step.description}</div>
            {step.state === "error" && step.errorMessage ? (
              <div className="mt-2 text-xs font-medium text-danger">
                {step.errorMessage}
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
