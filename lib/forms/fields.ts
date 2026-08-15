export const HOSTED_FORM_FIELDS = [
  { name: "business_name", label: "Business name", type: "text", required: true },
  { name: "handle", label: "Email or social handle", type: "text", required: false },
  { name: "phone_number", label: "Phone number", type: "tel", required: false },
  { name: "website_url", label: "Website", type: "url", required: false },
  { name: "industry", label: "Industry", type: "text", required: false },
  { name: "country", label: "Country", type: "text", required: false },
  { name: "state", label: "State / region", type: "text", required: false },
  { name: "location", label: "City / location", type: "text", required: false },
  { name: "notes", label: "How can we help?", type: "textarea", required: false },
] as const;

export type HostedFormField = {
  name: (typeof HOSTED_FORM_FIELDS)[number]["name"];
  label: string;
  type: "text" | "tel" | "url" | "textarea";
  required: boolean;
};

export function canonicalFieldMappings() {
  return Object.fromEntries(
    [
      "business_name", "platform", "handle", "phone_number", "industry",
      "location", "state", "country", "website_url", "status", "notes",
    ].map((field) => [field, field]),
  );
}
