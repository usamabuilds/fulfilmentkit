import { fkToast } from "@/components/fk-toaster";

type ToastInput = {
  title: string;
  description?: string;
};

export function toastSuccess({ title, description }: ToastInput) {
  fkToast({
    variant: "success",
    title,
    description,
  });
}

export function toastError({ title, description }: ToastInput) {
  fkToast({
    variant: "error",
    title,
    description,
  });
}
