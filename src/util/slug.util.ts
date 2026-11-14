export const slugify = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[\u200c\u200f]/g, " ")          
    .replace(/ي/g, "ی").replace(/ك/g, "ک")   
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");