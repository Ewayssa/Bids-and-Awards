import React from 'react';

const POPrintLayout = React.forwardRef(({ data, prItems }, ref) => {
    if (!data) return null;

    const items = prItems || [];
    
    return (
        <div ref={ref} className="bg-white p-10 text-black font-serif text-[11px] print:p-0" style={{ width: '210mm', minHeight: '297mm', fontFamily: "'Times New Roman', Times, serif" }}>
            {/* Top Appendix Label */}
            <div className="text-right italic text-sm mb-1">Appendix 61</div>

            {/* Header */}
            <div className="text-center py-4">
                <h1 className="text-base font-bold uppercase tracking-widest">PURCHASE ORDER</h1>
                <h2 className="text-base font-bold uppercase">DILG REGION 1</h2>
            </div>

            <div className="border-[1.5px] border-black">

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
                                <td className="border-r-[1.5px] border-black p-1 text-center">{Number(item.quantity).toLocaleString('en-PH', { maximumFractionDigits: 0 })}</td>
                                <td className="border-r-[1.5px] border-black p-1 text-right pr-2">
                                    {Number(item.unit_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-1 text-right pr-2 font-bold">
                                    {Number(item.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                        {/* Minimum 15 rows for layout consistency */}
                        {[...Array(Math.max(0, 15 - (data.items?.length || 0)))].map((_, i) => (
                            <tr key={`empty-${i}`} className="border-b border-black">
                                <td className="border-r-[1.5px] border-black p-1 text-center h-7"></td>
                                <td className="border-r-[1.5px] border-black p-1 text-center"></td>
                                <td className="border-r-[1.5px] border-black p-1 px-2"></td>
                                <td className="border-r-[1.5px] border-black p-1 text-center"></td>
                                <td className="border-r-[1.5px] border-black p-1 text-right pr-2"></td>
                                <td className="p-1 text-right pr-2"></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-b-[1.5px] border-black">
                            <td colSpan="1" className="border-t-[1.5px] border-r-[1.5px] border-black p-1 text-[9px] font-bold leading-tight">
                                (Total Amount in Words)
                            </td>
                            <td colSpan="4" className="border-t-[1.5px] border-r-[1.5px] border-black p-2 px-3 text-left uppercase italic text-[10px] leading-tight">
                                {data.amount_in_words}
                            </td>
                            <td className="border-t-[1.5px] border-black p-1 text-right pr-2 text-xs font-bold">
                                {Number(data.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
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
                    <div className="border-r-[1.5px] border-black p-2 flex flex-col h-40">
                        <div className="mb-auto">Conforme:</div>
                        <div className="text-center px-10 pb-2">
                            <div className="border-b border-black mb-1"></div>
                            <div className="text-[10px]">Signature over Printed Name of Supplier</div>
                            <div className="border-b border-black mt-8 mb-1 w-48 mx-auto"></div>
                            <div className="text-[10px]">Date</div>
                        </div>
                    </div>
                    <div className="p-2 flex flex-col h-40">
                        <div className="mb-auto">Very truly yours,</div>
                        <div className="text-center px-4 pb-2">
                            <div className="font-bold text-sm uppercase underline decoration-1 underline-offset-2">JONATHAN PAUL M. LEUSEN, JR., CESO III</div>
                            <div className="text-[11px] font-bold">Regional Director</div>
                            <div className="border-b border-black mt-10 mb-1 w-48 mx-auto"></div>
                            <div className="text-[10px]">Designation</div>
                        </div>
                    </div>
                </div>

                {/* Accounting Section */}
                <div className="grid grid-cols-2">
                    <div className="border-r-[1.5px] border-black p-2 space-y-3">
                        <div className="flex gap-2 mt-2">
                            <span className="font-bold">Fund Cluster :</span>
                            <span className="border-b border-black flex-1 min-h-[16px]">{data.fund_cluster}</span>
                        </div>
                        <div className="flex gap-2 pb-6">
                            <span className="font-bold">Funds Available :</span>
                            <span className="border-b border-black flex-1 min-h-[16px]">{data.funds_available}</span>
                        </div>
                        
                        <div className="text-center pt-4">
                            <div className="font-bold underline uppercase text-sm decoration-1 underline-offset-2">DENNIS A. LIM</div>
                            <div className="text-[11px] font-bold uppercase">ACCOUNTANT II</div>
                            <div className="text-[10px] mt-1 italic">Signature over Printed Name of Authorized Official</div>
                        </div>
                    </div>
                    <div className="p-2 space-y-4">
                        <div className="flex gap-2 mt-2">
                            <span className="font-bold whitespace-nowrap">Account Code :</span>
                            <span className="border-b border-black flex-1 min-h-[16px]">{data.ors_burs_no}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-bold whitespace-nowrap">Date of the ORS/BURS:</span>
                            <span className="border-b border-black flex-1 min-h-[16px]">{data.date_of_ors_burs}</span>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <span className="font-bold whitespace-nowrap">ORS/BURS No. :</span>
                            <span className="border-b border-black flex-1 min-h-[16px] font-bold">
                                {data.ors_burs_amount}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default POPrintLayout;
