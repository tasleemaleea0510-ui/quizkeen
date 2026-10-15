/**
 * Supabase answers in English ("Email not confirmed", "User already
 * registered"), which is confusing on an otherwise Swedish sign-in form. Map the
 * known ones to something a 12-year-old can act on, and pass anything unknown
 * through unchanged rather than hiding it behind a generic message.
 */
export function authErrorSv(message: string): string {
  const m = (message || "").toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already exists")) {
    return "Den här e-postadressen har redan ett konto — logga in i stället.";
  }
  if (m.includes("email not confirmed")) {
    return "Du måste bekräfta din e-post först. Öppna mejlet från QuizKeen (kolla skräpposten) och tryck på länken.";
  }
  if (m.includes("password should be") || m.includes("at least 6")) {
    return "Lösenordet måste vara minst 6 tecken.";
  }
  if (m.includes("unable to validate email") || m.includes("invalid email") || m.includes("invalid format")) {
    return "E-postadressen godkänns inte — kontrollera stavningen.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "För många försök just nu. Vänta en stund och försök igen.";
  }
  if (m.includes("invalid login credentials")) {
    return "Fel e-post eller lösenord.";
  }
  if (m.includes("signup") && m.includes("disabled")) {
    return "Nya konton är avstängda just nu.";
  }
  return message || "Något gick fel. Försök igen.";
}
