export type EarlyAccessFormState = {
  status: "idle" | "success" | "error";
  message: string;
  duplicate?: boolean;
};

export const earlyAccessInitialState: EarlyAccessFormState = {
  status: "idle",
  message: "",
};
