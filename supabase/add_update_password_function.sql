-- Function to update user password
CREATE OR REPLACE FUNCTION update_user_password(
    user_id_input UUID,
    new_password_input TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users
    SET password_hash = crypt(new_password_input, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = user_id_input;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
