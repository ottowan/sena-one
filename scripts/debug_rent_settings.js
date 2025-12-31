
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRentSettings() {
    console.log("Checking Rent Settings...");

    // 1. Get Rent Settings
    const { data: settings, error: settingsError } = await supabase
        .from('rent_settings')
        .select('*');

    if (settingsError) {
        console.error("Error fetching settings:", settingsError);
    } else {
        console.log("Rent Settings:", settings);
    }

    // 2. Get Room 301 Tenant again to be sure
    const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_number', '301')
        .single();

    if (room) {
        const { data: contract } = await supabase
            .from('contracts')
            .select('*, tenant:tenants(*)')
            .eq('room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (contract && contract.tenant) {
            console.log(`Tenant: ${contract.tenant.full_name}`);
            console.log(`Position Level: '${contract.tenant.position_level}'`); // single quotes to see whitespace

            // Check match
            const match = settings.find(s => s.position_level === contract.tenant.position_level);
            console.log("Match found in settings:", match);
        }
    }
}

checkRentSettings();
