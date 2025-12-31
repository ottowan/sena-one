
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRoom301() {
    console.log("Checking Room 301...");

    // 1. Get Room ID
    const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_number', '301')
        .single();

    if (roomError) {
        console.error("Error fetching room:", roomError);
        return;
    }
    console.log("Room:", room);

    // 2. Get Contracts for Room
    const { data: contracts, error: contractError } = await supabase
        .from('contracts')
        .select('*, tenant:tenants(*)')
        .eq('room_id', room.id)
        .order('created_at', { ascending: false });

    if (contractError) {
        console.error("Error fetching contracts:", contractError);
        return;
    }

    console.log("Contracts found:", contracts.length);
    contracts.forEach((c, i) => {
        console.log(`[${i}] ID: ${c.id}`);
        console.log(`    Status: ${c.status}`);
        console.log(`    Rent: ${c.monthly_rent}`);
        console.log(`    Created: ${c.created_at}`);
        console.log(`    Tenant: ${c.tenant?.full_name}`);
        console.log(`    Level: ${c.tenant?.position_level}`);
    });
}

checkRoom301();
