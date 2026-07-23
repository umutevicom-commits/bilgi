/*
# Fix: handle_new_user() search_path eksikliği

## Sorun
auth.users tablosuna INSERT olduğunda tetiklenen handle_new_user()
fonksiyonu, "profiles" tablosuna schema belirtmeden INSERT yapıyordu.
Bu trigger supabase_auth_admin rolüyle çalıştığı için, bu rolün
varsayılan search_path'inde "public" şeması yer almıyor. Sonuç olarak
her kayıt denemesinde "relation "profiles" does not exist" (42P01)
hatasıyla 500 dönüyordu (Supabase Auth logs: "Database error saving
new user").

## Çözüm
Fonksiyonu SET search_path = public ile yeniden oluşturup, tablo adını
public.profiles olarak açıkça belirtiyoruz.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
