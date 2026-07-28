import {
  getCountryCallingCode,
  getExampleNumber,
  type CountryCode,
} from "libphonenumber-js"
import examples from "libphonenumber-js/examples.mobile.json"

import { COUNTRIES } from "@/lib/constants/countries"

function getDialingCode(countryCode: string): string | null {
  try {
    return `+${getCountryCallingCode(countryCode as CountryCode)}`
  } catch {
    return null
  }
}

export function GET() {
  const countries = COUNTRIES.map((country) => {
    const countryCode = country.code as CountryCode
    return {
      ...country,
      dialingCode: getDialingCode(country.code),
      phoneExample: getExampleNumber(countryCode, examples)?.formatNational() ?? null,
    }
  })

  return Response.json(countries, {
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  })
}
