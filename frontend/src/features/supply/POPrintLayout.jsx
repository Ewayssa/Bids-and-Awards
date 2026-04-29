import React from 'react';

const POPrintLayout = React.forwardRef(({ data, prItems }, ref) => {
    if (!data) return null;

    const items = prItems || [];
    
    return (
        <div ref={ref} className="bg-white p-10 text-black font-serif text-[11px] print:p-0" style={{ width: '210mm', minHeight: '297mm', fontFamily: "'Times New Roman', Times, serif" }}>
            {/* Top Appendix Label */}
            <div className="text-right italic text-sm mb-1">Appendix 61</div>

            <div className="border-[1.5px] border-black">
                {/* Header */}
                <div className="text-center py-2 border-b-[1.5px] border-black">
                    <h1 className="text-sm font-bold uppercase tracking-widest">PURCHASE ORDER</h1>
                    <h2 className="text-sm font-bold uppercase">DILG REGION 1</h2>
                </div>

                {/* Supplier Info Section */}
                <div className="grid grid-cols-[1.2fr_0.8fr] border-b-[1.5px] border-black">
                    <div className="border-r-[1.5px] border-black p-1 space-y-0.5">
                        <div className="flex">
                            <span className="w-20">SUPPLIER:</span>
                            <span className="font-bold uppercase flex-1">{data.supplier_name}</span>
                        </div>
                        <div className="flex">
                            <span className="w-20">SUPPLIER:</span>
                            <span className="flex-1 uppercase text-[10px]">{data.supplier_address}</span>
                        </div>
                        <div className="flex pt-1">
                            <span className="w-20">TIN:</span>
                            <span className="flex-1">{data.tin}</span>
                        </div>
                    </div>
                    <div className="p-1 space-y-0.5">
                        <div className="flex">
                            <span className="w-32">Purchase Order No.</span>
                            <span className="flex-1">{data.po_no}</span>
                        </div>
                        <div className="flex">
                            <span className="w-32">Date :</span>
                            <span className="flex-1">{data.po_date || data.date}</span>
                        </div>
                        <div className="flex">
                            <span className="w-32 text-[10px]">Mode of Procurement :</span>
                            <span className="flex-1 uppercase text-[9px] font-bold leading-tight">{data.mode_of_procurement}</span>
                        </div>
                    </div>
                </div>

                {/* Salutation */}
                <div className="p-2 border-b-[1.5px] border-black">
                    <div className="font-bold mb-1">Gentlemen:</div>
                    <div className="pl-12">
                        Please furnish this Office the following articles subject to the terms and conditions contained herein:
                    </div>
                </div>

                {/* Delivery Info */}
                <div className="grid grid-cols-2 border-b-[1.5px] border-black">
                    <div className="border-r-[1.5px] border-black p-1">
                        <div className="flex gap-1">
                            <span className="">Place of Delivery :</span>
                            <span className="font-bold">{data.place_of_delivery}</span>
                        </div>
                        <div className="flex gap-1">
                            <span className="">Date of Delivery :</span>
                            <span className="font-bold">{data.date_of_delivery}</span>
                        </div>
                    </div>
                    <div className="p-1">
                        <div className="flex gap-1">
                            <span className="">Payment Term :</span>
                            <span className="font-bold uppercase">{data.payment_term}</span>
                        </div>
                        <div className="flex gap-1">
                            <span className="">Payment Term :</span>
                            <span className="font-bold uppercase">{data.payment_term}</span>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b-[1.5px] border-black text-center font-bold">
                            <th className="border-r-[1.5px] border-black p-1 w-[15%] leading-tight">Stock/<br />Property No.</th>
                            <th className="border-r-[1.5px] border-black p-1 w-[10%]">Unit</th>
                            <th className="border-r-[1.5px] border-black p-1 w-[40%]">Description</th>
                            <th className="border-r-[1.5px] border-black p-1 w-[10%]">Quantity</th>
                            <th className="border-r-[1.5px] border-black p-1 w-[12%]">Unit Cost</th>
                            <th className="p-1 w-[13%]">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx} className="border-b border-dotted border-slate-200">
                                <td className="border-r-[1.5px] border-black p-1 text-center h-7">{item.stockNo || ''}</td>
                                <td className="border-r-[1.5px] border-black p-1 text-center">{item.unit}</td>
                                <td className="border-r-[1.5px] border-black p-1 px-2">{item.description}</td>
                                <td className="border-r-[1.5px] border-black p-1 text-center">{item.quantity}</td>
                                <td className="border-r-[1.5px] border-black p-1 text-right pr-2">
                                    {Number(item.unit_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-1 text-right pr-2 font-bold">
                                    {Number(item.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                        {/* Minimum 15 rows for layout consistency */}
                        {[...Array(Math.max(0, 15 - items.length))].map((_, i) => (
                            <tr key={`empty-${i}`} className="h-7">
                                <td className="border-r-[1.5px] border-black"></td>
                                <td className="border-r-[1.5px] border-black"></td>
                                <td className="border-r-[1.5px] border-black"></td>
                                <td className="border-r-[1.5px] border-black"></td>
                                <td className="border-r-[1.5px] border-black"></td>
                                <td></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-[1.5px] border-black font-bold">
                            <td colSpan="1" className="border-r-[1.5px] border-black p-1 text-[9px] font-normal leading-tight">
                                (Total Amount in Words)
                            </td>
                            <td colSpan="4" className="border-r-[1.5px] border-black p-1 px-3 text-center uppercase italic text-[10px]">
                                {data.amount_in_words}
                            </td>
                            <td className="p-1 text-right pr-2 text-sm border-t-[1.5px] border-black">
                                {Number(data.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </td>
                        </tr>
                    </tfoot>
                </table>

                {/* Penalty Clause */}
                <div className="p-2 border-t-[1.5px] border-b-[1.5px] border-black text-[10px] leading-tight">
                    In case of failure to make the full delivery within the time specified above, a penalty of one-tenth (1/10) of one percent for every day of delay shall be imposed on the undelivered item/s.
                </div>

                {/* Signature Section */}
                <div className="grid grid-cols-2 border-b-[1.5px] border-black">
                    <div className="border-r-[1.5px] border-black p-2 flex flex-col h-32">
                        <div className="mb-auto">Conforme:</div>
                        <div className="text-center px-10">
                            <div className="border-b border-black mb-1"></div>
                            <div className="text-[9px]">Signature over Printed Name of Supplier</div>
                            <div className="border-b border-black mt-4 mb-1 w-32 mx-auto"></div>
                            <div className="text-[9px]">Date</div>
                        </div>
                    </div>
                    <div className="p-2 flex flex-col h-32">
                        <div className="mb-auto">Very truly yours,</div>
                        <div className="text-center px-4">
                            <div className="font-bold text-xs uppercase underline">JONATHAN PAUL M. LEUSEN, JR., CESO III</div>
                            <div className="text-[10px] font-bold">Regional Director</div>
                            <div className="border-b border-black mt-6 mb-1 w-32 mx-auto"></div>
                            <div className="text-[9px]">Designation</div>
                        </div>
                    </div>
                </div>

                {/* Accounting Section */}
                <div className="grid grid-cols-[1.1fr_0.9fr]">
                    <div className="border-r-[1.5px] border-black p-1 space-y-2">
                        <div className="flex gap-2">
                            <span className="font-bold">Fund Cluster :</span>
                            <span className="border-b border-black flex-1 min-h-[14px]">{data.fund_cluster}</span>
                        </div>
                        <div className="flex gap-2 pb-4">
                            <span className="font-bold">Funds Available :</span>
                            <span className="border-b border-black flex-1 min-h-[14px]">{data.funds_available}</span>
                        </div>
                        
                        <div className="text-center pt-2">
                            <div className="font-bold underline uppercase text-xs">DENNIS A. LIM</div>
                            <div className="text-[10px] font-bold uppercase">ACCOUNTANT II</div>
                            <div className="text-[9px] mt-1 italic">Signature over Printed Name of Authorized Official</div>
                        </div>
                    </div>
                    <div className="p-1 space-y-2">
                        <div className="flex gap-2">
                            <span className="font-bold whitespace-nowrap">ORS/BURS No. :</span>
                            <span className="border-b border-black flex-1 min-h-[14px]">{data.ors_burs_no}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-bold whitespace-nowrap">Date of the ORS/BURS:</span>
                            <span className="border-b border-black flex-1 min-h-[14px]">{data.date_of_ors_burs}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-bold whitespace-nowrap">Amount :</span>
                            <span className="border-b border-black flex-1 min-h-[14px]">
                                {data.ors_burs_amount ? `₱${Number(data.ors_burs_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : ''}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
    );
});

export default POPrintLayout;
