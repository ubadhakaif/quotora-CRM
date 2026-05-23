import { parseCSV } from './csvParser';

export interface ImportProgress {
  current: number;
  total: number;
  created: number;
  updated: number;
  errors: string[];
}

/**
 * Imports vehicle variants from a CSV string.
 * Automatically looks up and creates models, fuel types, and transmissions if they don't exist.
 */
export async function importVariantsFromCSV(
  csvText: string,
  tenantId: string,
  supabase: any,
  onProgress: (progress: ImportProgress) => void
): Promise<ImportProgress> {
  const rows = parseCSV(csvText);
  const result: ImportProgress = {
    current: 0,
    total: 0,
    created: 0,
    updated: 0,
    errors: [],
  };

  if (rows.length < 2) {
    result.errors.push('The CSV file is empty or only contains headers.');
    return result;
  }

  // Parse headers case-insensitively
  const headers = rows[0].map(h => h.toLowerCase().trim());
  const modelIdx = headers.indexOf('model_name');
  const variantIdx = headers.indexOf('variant_name');
  const priceIdx = headers.indexOf('base_price');
  
  // Optional headers
  const fuelIdx = headers.indexOf('fuel_type');
  const transIdx = headers.indexOf('transmission_type');
  const orderIdx = headers.indexOf('variant_order');

  if (modelIdx === -1 || variantIdx === -1 || priceIdx === -1) {
    result.errors.push('Missing required headers: "model_name", "variant_name", and "base_price" must be present.');
    return result;
  }

  const dataRows = rows.slice(1);
  result.total = dataRows.length;

  // Load existing entity caches to minimize database queries
  const [modelsRes, fuelsRes, transRes] = await Promise.all([
    supabase.from('models').select('id, name').eq('tenant_id', tenantId).eq('is_active', true),
    supabase.from('fuel_types').select('id, name').eq('tenant_id', tenantId).eq('is_active', true),
    supabase.from('transmission_types').select('id, name').eq('tenant_id', tenantId).eq('is_active', true)
  ]);

  const modelCache = new Map<string, string>((modelsRes.data || []).map((m: any) => [m.name.toLowerCase(), m.id]));
  const fuelCache = new Map<string, string>((fuelsRes.data || []).map((f: any) => [f.name.toLowerCase(), f.id]));
  const transCache = new Map<string, string>((transRes.data || []).map((t: any) => [t.name.toLowerCase(), t.id]));

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    result.current = i + 1;

    try {
      const modelName = row[modelIdx]?.trim();
      const variantName = row[variantIdx]?.trim();
      const priceStr = row[priceIdx]?.trim();

      if (!modelName || !variantName || !priceStr) {
        result.errors.push(`Row ${i + 2}: Skipping row. Model, variant name, and base price are all required.`);
        onProgress({ ...result });
        continue;
      }

      const basePrice = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
      if (isNaN(basePrice)) {
        result.errors.push(`Row ${i + 2}: Skipping row. Base price "${priceStr}" is not a valid number.`);
        onProgress({ ...result });
        continue;
      }

      // 1. Get or Create Model
      let modelId = modelCache.get(modelName.toLowerCase());
      if (!modelId) {
        const { data: newModel, error: modelErr } = await supabase
          .from('models')
          .insert({ tenant_id: tenantId, name: modelName, is_active: true })
          .select('id')
          .single();

        if (modelErr) throw new Error(`Model creation failed: ${modelErr.message}`);
        modelId = newModel.id;
        modelCache.set(modelName.toLowerCase(), modelId!);
      }

      // 2. Get or Create Fuel Type (Optional)
      let fuelTypeId: string | null = null;
      const fuelName = fuelIdx !== -1 ? row[fuelIdx]?.trim() : '';
      if (fuelName) {
        fuelTypeId = fuelCache.get(fuelName.toLowerCase()) || null;
        if (!fuelTypeId) {
          const { data: newFuel, error: fuelErr } = await supabase
            .from('fuel_types')
            .insert({ tenant_id: tenantId, name: fuelName, is_active: true })
            .select('id')
            .single();

          if (fuelErr) throw new Error(`Fuel type creation failed: ${fuelErr.message}`);
          fuelTypeId = newFuel.id;
          fuelCache.set(fuelName.toLowerCase(), fuelTypeId!);
        }
      }

      // 3. Get or Create Transmission Type (Optional)
      let transTypeId: string | null = null;
      const transName = transIdx !== -1 ? row[transIdx]?.trim() : '';
      if (transName) {
        transTypeId = transCache.get(transName.toLowerCase()) || null;
        if (!transTypeId) {
          const { data: newTrans, error: transErr } = await supabase
            .from('transmission_types')
            .insert({ tenant_id: tenantId, name: transName, is_active: true })
            .select('id')
            .single();

          if (transErr) throw new Error(`Transmission type creation failed: ${transErr.message}`);
          transTypeId = newTrans.id;
          transCache.set(transName.toLowerCase(), transTypeId!);
        }
      }

      const variantOrder = orderIdx !== -1 ? parseInt(row[orderIdx]) || 0 : 0;

      // 4. Upsert Variant
      const { data: existingVariant } = await supabase
        .from('variants')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('model_id', modelId)
        .eq('name', variantName)
        .maybeSingle();

      if (existingVariant) {
        const { error: updateErr } = await supabase
          .from('variants')
          .update({
            price: basePrice,
            fuel_type_id: fuelTypeId,
            transmission_type_id: transTypeId,
            variant_order: variantOrder,
            is_active: true
          })
          .eq('id', existingVariant.id);

        if (updateErr) throw new Error(`Variant update failed: ${updateErr.message}`);
        result.updated++;
      } else {
        const { error: insertErr } = await supabase
          .from('variants')
          .insert({
            tenant_id: tenantId,
            model_id: modelId,
            name: variantName,
            price: basePrice,
            fuel_type_id: fuelTypeId,
            transmission_type_id: transTypeId,
            variant_order: variantOrder,
            is_active: true
          });

        if (insertErr) throw new Error(`Variant creation failed: ${insertErr.message}`);
        result.created++;
      }
    } catch (err: any) {
      result.errors.push(`Row ${i + 2}: ${err.message || err}`);
    }

    onProgress({ ...result });
  }

  return result;
}

/**
 * Imports accessories from a CSV string.
 * Automatically looks up and creates accessory categories (accessory_types) if they don't exist.
 */
export async function importAccessoriesFromCSV(
  csvText: string,
  tenantId: string,
  supabase: any,
  onProgress: (progress: ImportProgress) => void
): Promise<ImportProgress> {
  const rows = parseCSV(csvText);
  const result: ImportProgress = {
    current: 0,
    total: 0,
    created: 0,
    updated: 0,
    errors: [],
  };

  if (rows.length < 2) {
    result.errors.push('The CSV file is empty or only contains headers.');
    return result;
  }

  // Parse headers case-insensitively
  const headers = rows[0].map(h => h.toLowerCase().trim());
  const accNameIdx = headers.indexOf('accessory_name');
  const priceIdx = headers.indexOf('price');
  
  // Optional headers
  const categoryIdx = headers.indexOf('category_name');

  if (accNameIdx === -1 || priceIdx === -1) {
    result.errors.push('Missing required headers: "accessory_name" and "price" must be present.');
    return result;
  }

  const dataRows = rows.slice(1);
  result.total = dataRows.length;

  // Load existing accessory types cache
  const { data: typesRes } = await supabase
    .from('accessory_types')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  const categoryCache = new Map<string, string>((typesRes || []).map((t: any) => [t.name.toLowerCase(), t.id]));

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    result.current = i + 1;

    try {
      const accessoryName = row[accNameIdx]?.trim();
      const priceStr = row[priceIdx]?.trim();

      if (!accessoryName || !priceStr) {
        result.errors.push(`Row ${i + 2}: Skipping row. Accessory name and price are required.`);
        onProgress({ ...result });
        continue;
      }

      const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
      if (isNaN(price)) {
        result.errors.push(`Row ${i + 2}: Skipping row. Price "${priceStr}" is not a valid number.`);
        onProgress({ ...result });
        continue;
      }

      // 1. Get or Create Category (Accessory Type)
      let typeId: string | null = null;
      const categoryName = categoryIdx !== -1 ? row[categoryIdx]?.trim() : '';
      if (categoryName) {
        typeId = categoryCache.get(categoryName.toLowerCase()) || null;
        if (!typeId) {
          const { data: newType, error: typeErr } = await supabase
            .from('accessory_types')
            .insert({ tenant_id: tenantId, name: categoryName, is_active: true })
            .select('id')
            .single();

          if (typeErr) throw new Error(`Category creation failed: ${typeErr.message}`);
          typeId = newType.id;
          categoryCache.set(categoryName.toLowerCase(), typeId!);
        }
      }

      // 2. Upsert Accessory
      const { data: existingAcc } = await supabase
        .from('accessories')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', accessoryName)
        .maybeSingle();

      if (existingAcc) {
        const { error: updateErr } = await supabase
          .from('accessories')
          .update({
            price: price,
            type_id: typeId,
            is_active: true
          })
          .eq('id', existingAcc.id);

        if (updateErr) throw new Error(`Accessory update failed: ${updateErr.message}`);
        result.updated++;
      } else {
        const { error: insertErr } = await supabase
          .from('accessories')
          .insert({
            tenant_id: tenantId,
            name: accessoryName,
            price: price,
            type_id: typeId,
            is_active: true
          });

        if (insertErr) throw new Error(`Accessory creation failed: ${insertErr.message}`);
        result.created++;
      }
    } catch (err: any) {
      result.errors.push(`Row ${i + 2}: ${err.message || err}`);
    }

    onProgress({ ...result });
  }

  return result;
}
