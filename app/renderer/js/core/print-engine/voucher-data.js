function getVoucherData(type, keyOrId) {
  const reportDateStr = state.reportDate || t('not_specified');
  const formattedDate = formatDateString(reportDateStr);
  const preparedBy = document.querySelector('.prepared span') ? document.querySelector('.prepared span').innerText : "ثابت صالح ثابت";
  
  if (type === 'purchases') {
    const item = state.purchases.find(p => p.id == keyOrId);
    if (!item) return null;
    
    const catName = t(`expense_cat_${item.category}`, t('expense_cat_other'));
    return {
      type: 'purchase',
      title: t('expense_payment_voucher_title'),
      subTitle: t('expense_payment_voucher_title'),
      refNo: `EXP-${reportDateStr.replace(/-/g, '')}-${item.id}`,
      date: formattedDate,
      name: item.name,
      details: item.qty || '—',
      category: catName,
      amount: item.amount,
      preparedBy: preparedBy
    };
  } else if (type === 'sales') {
    const salesMeta = {
      cash: { name: t('sales_cash'), sub: t('cash_sales_system'), icon: '💵' },
      kbank: { name: 'KBank', sub: t('kbank_card_sales'), icon: '🏦' },
      grab: { name: 'GrabFood', sub: t('grab_food_sales'), icon: '🛵' },
      lineman: { name: 'LineMan', sub: t('lineman_sales'), icon: '💬' },
      krungsri: { name: 'Krungsri Online', sub: t('krungsri_online_sales'), icon: '🌐' }
    };
    
    const meta = salesMeta[keyOrId];
    if (!meta) return null;
    
    let amount = 0;
    if (keyOrId === 'cash') amount = window.safeParseFloat(state.sales.cash) || 0;
    else if (keyOrId === 'kbank') amount = window.safeParseFloat(state.sales.kbank) || 0;
    else if (keyOrId === 'grab') amount = window.safeParseFloat(state.sales.grab) || 0;
    else if (keyOrId === 'lineman') amount = window.safeParseFloat(state.sales.lineman) || 0;
    else if (keyOrId === 'krungsri') amount = window.safeParseFloat(state.sales.krungsri) || 0;
    
    return {
      type: 'sale',
      title: t('sales_revenue_voucher_title'),
      subTitle: t('sales_revenue_voucher_title'),
      refNo: `REV-${reportDateStr.replace(/-/g, '')}-${keyOrId.toUpperCase()}`,
      date: formattedDate,
      name: meta.name,
      details: meta.sub,
      category: t('daily_sales_revenue_category'),
      amount: amount,
      preparedBy: preparedBy
    };
  }
  return null;
}
