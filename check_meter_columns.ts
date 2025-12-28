
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
    console.log('Checking rooms table columns...');
    const { data, error } = await supabase
        .from('rooms')
        .select('current_water_meter, current_electricity_meter')
        .limit(1);

    if (error) {
        console.error('Error selecting columns:', error);
    } else {
        console.log('Success! Data:', data);
    }
}

checkColumns();
